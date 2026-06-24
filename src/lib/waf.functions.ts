import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------- Types ----------------
export interface InspectInput {
  method: string;
  path: string;
  body?: string;
  userAgent?: string;
}

export interface MatchedRule {
  id: string;
  name: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  weight: number;
  layer: string; // which decode pass found it
}

export interface InspectResult {
  allowed: boolean;
  matchedRuleId?: string;
  matchedRuleName?: string;
  category?: string;
  severity?: "low" | "medium" | "high" | "critical";
  reason?: string;
  threatScore: number;
  matchedRules: MatchedRule[];
  logId?: string;
}

const inspectSchema = z.object({
  method: z.string().min(1).max(10),
  path: z.string().min(1).max(2048),
  body: z.string().max(8192).optional(),
  userAgent: z.string().max(512).optional(),
});

// ---------------- ReDoS guard ----------------
// Reject patterns with obvious catastrophic-backtracking shapes (nested
// quantifiers like (a+)+, (.*)*, (a|a)+, etc.) before they ever run.
const UNSAFE_PATTERN_HEURISTICS: RegExp[] = [
  /\([^()]*[+*][^()]*\)[+*]/,            // (x+)+ or (x*)*
  /\([^()]*\{\d+,?\d*\}[^()]*\)\{\d+,?\d*\}/, // ({n,}){n,}
  /\((?:[^()|]+\|)+[^()|]+\)[+*]/,       // (a|a|...)+
];
export function isPatternSafe(pattern: string): { ok: true } | { ok: false; reason: string } {
  if (pattern.length > 512) return { ok: false, reason: "Pattern exceeds 512 characters" };
  for (const h of UNSAFE_PATTERN_HEURISTICS) {
    if (h.test(pattern)) return { ok: false, reason: "Pattern contains nested quantifiers (potential ReDoS)" };
  }
  return { ok: true };
}

// Run regex.test with a wall-clock budget. JS cannot truly abort regex,
// but we record overruns and disable the offending rule for this request.
const REGEX_BUDGET_MS = 25;
function safeTest(re: RegExp, text: string): { matched: boolean; tookMs: number; overran: boolean } {
  const start = Date.now();
  let matched = false;
  try { matched = re.test(text); } catch { matched = false; }
  const tookMs = Date.now() - start;
  return { matched, tookMs, overran: tookMs > REGEX_BUDGET_MS };
}

// Fake IP for the simulator — derived from a hash of session-like data
function pseudoIp(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = (Math.abs(h) % 223) + 11;
  const b = (Math.abs(h >> 8) % 254) + 1;
  const c = (Math.abs(h >> 16) % 254) + 1;
  const d = (Math.abs(h >> 24) % 254) + 1;
  return `${a}.${b}.${c}.${d}`;
}

// ---------------- Telegram notifier (fire-and-forget) ----------------
async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.length > 3900 ? text.slice(0, 3900) + "…" : text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.warn("[WAF] telegram notify failed:", e);
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatEvent(opts: {
  status: "ALLOWED" | "BLOCKED";
  ip: string;
  method: string;
  path: string;
  body?: string;
  userAgent?: string;
  reason?: string;
  threatScore: number;
  category?: string;
  severity?: string;
  matched: MatchedRule[];
}): string {
  const icon = opts.status === "BLOCKED" ? "🚫" : "✅";
  const lines = [
    `${icon} <b>${opts.status}</b>`,
    `<b>IP:</b> <code>${esc(opts.ip)}</code>`,
    `<b>Req:</b> <code>${esc(opts.method)} ${esc(opts.path)}</code>`,
    `<b>Score:</b> ${opts.threatScore.toFixed(2)}`,
  ];
  if (opts.category) lines.push(`<b>Category:</b> ${esc(opts.category)}`);
  if (opts.severity) lines.push(`<b>Severity:</b> ${esc(opts.severity)}`);
  if (opts.reason) lines.push(`<b>Reason:</b> ${esc(opts.reason)}`);
  if (opts.matched.length)
    lines.push(`<b>Rules:</b> ${opts.matched.map((m) => esc(m.name)).join(", ")}`);
  if (opts.userAgent) lines.push(`<b>UA:</b> <code>${esc(opts.userAgent.slice(0, 200))}</code>`);
  if (opts.body) lines.push(`<b>Body:</b> <code>${esc(opts.body.slice(0, 500))}</code>`);
  return lines.join("\n");
}

// ---------------- Multi-pass decoding (anti-evasion) ----------------
function safeDecode(fn: () => string): string | null {
  try { return fn(); } catch { return null; }
}

function htmlEntityDecode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function buildDecodeLayers(input: string): { label: string; text: string }[] {
  const layers: { label: string; text: string }[] = [{ label: "raw", text: input }];
  const seen = new Set<string>([input]);

  const url1 = safeDecode(() => decodeURIComponent(input));
  if (url1 && !seen.has(url1)) { layers.push({ label: "url", text: url1 }); seen.add(url1); }

  const url2 = url1 ? safeDecode(() => decodeURIComponent(url1)) : null;
  if (url2 && !seen.has(url2)) { layers.push({ label: "url-x2", text: url2 }); seen.add(url2); }

  const html = htmlEntityDecode(url1 ?? input);
  if (!seen.has(html)) { layers.push({ label: "html-entity", text: html }); seen.add(html); }

  // Base64-decode any standalone-looking base64 chunks (>= 12 chars)
  const b64re = /[A-Za-z0-9+/]{12,}={0,2}/g;
  const base = url1 ?? input;
  const matches = base.match(b64re);
  if (matches) {
    for (const m of matches.slice(0, 5)) {
      const decoded = safeDecode(() => {
        if (typeof atob !== "undefined") return atob(m);
        // @ts-ignore
        return Buffer.from(m, "base64").toString("utf8");
      });
      if (decoded && /^[\x20-\x7e\s]+$/.test(decoded) && !seen.has(decoded)) {
        layers.push({ label: "base64", text: decoded });
        seen.add(decoded);
      }
    }
  }
  return layers;
}

// ---------------- Inspect Request ----------------
export const inspectRequest = createServerFn({ method: "POST" })
  .inputValidator((d: InspectInput) => inspectSchema.parse(d))
  .handler(async ({ data }): Promise<InspectResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestIP, getRequestHeader } = await import("@tanstack/react-start/server");

    // SECURITY: do NOT trust X-Forwarded-For — any client can spoof it and
    // bypass blocklist/auto-block enforcement. Use the raw socket IP only;
    // when unavailable (local dev / no proxy), derive a stable pseudo-IP.
    let ip = "0.0.0.0";
    try {
      ip = getRequestIP() || pseudoIp(data.path + (data.body ?? ""));
    } catch {
      ip = pseudoIp(data.path + (data.body ?? ""));
    }
    if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0")
      ip = pseudoIp(data.path + (data.body ?? "") + Date.now().toString().slice(-3));

    let userAgent = data.userAgent;
    try { userAgent = userAgent || getRequestHeader("user-agent") || undefined; } catch { /* noop */ }

    const [settingsRes, rulesRes, blockedRes] = await Promise.all([
      supabaseAdmin.from("waf_settings").select("*").eq("id", 1).maybeSingle(),
      supabaseAdmin.from("rules").select("*").eq("enabled", true),
      supabaseAdmin.from("blocked_ips").select("ip,blocked_until").eq("ip", ip).maybeSingle(),
    ]);
    const settings = settingsRes.data;
    const rulesData = rulesRes.data ?? [];
    const blocked = blockedRes.data;
    if (rulesRes.error) console.error("[WAF] rules fetch error:", rulesRes.error);

    if (settings && settings.enabled === false) {
      const { data: log } = await supabaseAdmin.from("requests_log").insert({
        ip, method: data.method, path: data.path, payload: data.body ?? null, user_agent: userAgent ?? null,
        allowed: true, reason: "WAF disabled", threat_score: 0,
      }).select("id").single();
      void notifyTelegram(formatEvent({
        status: "ALLOWED", ip, method: data.method, path: data.path, body: data.body, userAgent,
        reason: "WAF disabled", threatScore: 0, matched: [],
      }));
      return { allowed: true, threatScore: 0, matchedRules: [], logId: log?.id };
    }

    if (blocked && (!blocked.blocked_until || new Date(blocked.blocked_until) > new Date())) {
      const { data: log } = await supabaseAdmin.from("requests_log").insert({
        ip, method: data.method, path: data.path, payload: data.body ?? null, user_agent: userAgent ?? null,
        allowed: false, category: "ip_block", severity: "high", reason: "IP is on blocklist", threat_score: 10,
      }).select("id").single();
      void notifyTelegram(formatEvent({
        status: "BLOCKED", ip, method: data.method, path: data.path, body: data.body, userAgent,
        reason: "IP is on blocklist", category: "ip_block", severity: "high", threatScore: 10, matched: [],
      }));
      return { allowed: false, category: "ip_block", severity: "high", reason: "IP is on blocklist", threatScore: 10, matchedRules: [], logId: log?.id };
    }

    // Multi-pass decoded haystacks — defeat URL/Base64/HTML-entity evasion
    const rawCombined = `${data.method} ${data.path} ${data.body ?? ""}`;
    const layers = buildDecodeLayers(rawCombined);

    const matched: MatchedRule[] = [];
    const seenRuleIds = new Set<string>();
    type RuleRow = (typeof rulesData)[number];

    for (const rule of rulesData as RuleRow[]) {
      let pat = rule.pattern;
      let flags = "";
      const m = pat.match(/^\(\?([imsux]+)\)/);
      if (m) { flags = m[1].replace(/[^imsu]/g, ""); pat = pat.slice(m[0].length); }

      // ReDoS guard: skip patterns with known catastrophic-backtracking shapes
      const safety = isPatternSafe(pat);
      if (!safety.ok) { console.warn(`[WAF] skipping unsafe rule "${rule.name}": ${safety.reason}`); continue; }

      let re: RegExp;
      try { re = new RegExp(pat, flags); } catch (e) { console.warn("[WAF] bad regex", rule.name, e); continue; }

      for (const layer of layers) {
        const { matched: hit, overran } = safeTest(re, layer.text);
        if (overran) {
          console.warn(`[WAF] rule "${rule.name}" exceeded ${REGEX_BUDGET_MS}ms budget on ${layer.label}; skipping further layers`);
          break;
        }
        if (hit) {
          if (!seenRuleIds.has(rule.id)) {
            matched.push({
              id: rule.id,
              name: rule.name,
              category: rule.category,
              severity: rule.severity,
              weight: Number(rule.weight ?? 1),
              layer: layer.label,
            });
            seenRuleIds.add(rule.id);
          }
          break;
        }
      }
    }

    const threatScore = matched.reduce((s, r) => s + r.weight, 0);
    const threshold = 0.5;
    const blockedNow = threatScore >= threshold && matched.length > 0;

    console.log(`[WAF] rules=${rulesData.length} layers=${layers.length} matched=${matched.length} score=${threatScore.toFixed(2)} blocked=${blockedNow}`);

    if (blockedNow) {
      // Pick highest-weight match as "primary"
      const primary = [...matched].sort((a, b) => b.weight - a.weight)[0];
      const { data: log } = await supabaseAdmin.from("requests_log").insert({
        ip, method: data.method, path: data.path, payload: data.body ?? null, user_agent: userAgent ?? null,
        matched_rule_id: primary.id, matched_rule_name: primary.name,
        category: primary.category as any, severity: primary.severity,
        allowed: false, reason: `Score ${threatScore.toFixed(2)} ≥ ${threshold}; primary: ${primary.name}`,
        threat_score: threatScore,
        matched_rules: matched as any,
      }).select("id").single();

      const autoThreshold = settings?.auto_block_threshold ?? 5;
      const { count } = await supabaseAdmin.from("requests_log")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip).eq("allowed", false)
        .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
      if ((count ?? 0) >= autoThreshold) {
        await supabaseAdmin.from("blocked_ips").upsert(
          { ip, reason: `Auto-blocked after ${count} malicious requests`, blocked_until: new Date(Date.now() + 60 * 60_000).toISOString() },
          { onConflict: "ip" }
        );
        void notifyTelegram(`⛔ <b>IP auto-blocked</b>\n<b>IP:</b> <code>${esc(ip)}</code>\n<b>After:</b> ${count} malicious requests in 10m`);
      }

      void notifyTelegram(formatEvent({
        status: "BLOCKED", ip, method: data.method, path: data.path, body: data.body, userAgent,
        reason: `Score ${threatScore.toFixed(2)} ≥ ${threshold}; primary: ${primary.name}`,
        category: primary.category, severity: primary.severity, threatScore, matched,
      }));

      return {
        allowed: false,
        matchedRuleId: primary.id,
        matchedRuleName: primary.name,
        category: primary.category,
        severity: primary.severity,
        reason: `Threat score ${threatScore.toFixed(2)} exceeded threshold ${threshold}`,
        threatScore,
        matchedRules: matched,
        logId: log?.id,
      };
    }

    const { data: log } = await supabaseAdmin.from("requests_log").insert({
      ip, method: data.method, path: data.path, payload: data.body ?? null, user_agent: userAgent ?? null,
      allowed: true, threat_score: threatScore,
      matched_rules: matched.length ? (matched as any) : null,
    }).select("id").single();
    void notifyTelegram(formatEvent({
      status: "ALLOWED", ip, method: data.method, path: data.path, body: data.body, userAgent,
      threatScore, matched,
    }));
    return { allowed: true, threatScore, matchedRules: matched, logId: log?.id };
  });

// ---------------- Public stats (for landing page) ----------------
// Aggregated counts only — no row data. The previous SECURITY DEFINER RPC
// was removed to avoid exposing a public-callable definer function.
export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [blocked, requests, rules] = await Promise.all([
    supabaseAdmin.from("requests_log").select("id", { count: "exact", head: true }).eq("allowed", false),
    supabaseAdmin.from("requests_log").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("rules").select("id", { count: "exact", head: true }).eq("enabled", true),
  ]);
  return {
    total_blocked: blocked.count ?? 0,
    total_requests: requests.count ?? 0,
    active_rules: rules.count ?? 0,
  };
});

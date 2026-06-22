import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------------- Types ----------------
export interface InspectInput {
  method: string;
  path: string;
  body?: string;
  userAgent?: string;
}

export interface InspectResult {
  allowed: boolean;
  matchedRuleId?: string;
  matchedRuleName?: string;
  category?: string;
  severity?: "low" | "medium" | "high" | "critical";
  reason?: string;
  logId?: string;
}

const inspectSchema = z.object({
  method: z.string().min(1).max(10),
  path: z.string().min(1).max(2048),
  body: z.string().max(8192).optional(),
  userAgent: z.string().max(512).optional(),
});

// Fake IP for the simulator — derived from a hash of session-like data
function pseudoIp(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = Math.abs(h) % 223 + 11;
  const b = Math.abs(h >> 8) % 254 + 1;
  const c = Math.abs(h >> 16) % 254 + 1;
  const d = Math.abs(h >> 24) % 254 + 1;
  return `${a}.${b}.${c}.${d}`;
}

// ---------------- Inspect Request ----------------
export const inspectRequest = createServerFn({ method: "POST" })
  .inputValidator((d: InspectInput) => inspectSchema.parse(d))
  .handler(async ({ data }): Promise<InspectResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestIP, getRequestHeader } = await import("@tanstack/react-start/server");

    let ip = "0.0.0.0";
    try { ip = getRequestIP({ xForwardedFor: true }) || pseudoIp(data.path + data.body); } catch { ip = pseudoIp(data.path + (data.body ?? "")); }
    // For demos, randomize IP a bit so charts look alive
    if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") ip = pseudoIp(data.path + (data.body ?? "") + Date.now().toString().slice(-3));

    let userAgent = data.userAgent;
    try { userAgent = userAgent || getRequestHeader("user-agent") || undefined; } catch { /* ignore */ }

    // Load settings + rules
    const [{ data: settings }, { data: rulesData }, { data: blocked }] = await Promise.all([
      supabaseAdmin.from("waf_settings").select("*").eq("id", 1).maybeSingle(),
      supabaseAdmin.from("rules").select("*").eq("enabled", true),
      supabaseAdmin.from("blocked_ips").select("ip,blocked_until").eq("ip", ip).maybeSingle(),
    ]);

    if (settings && settings.enabled === false) {
      const { data: log } = await supabaseAdmin.from("requests_log").insert({
        ip, method: data.method, path: data.path, payload: data.body ?? null, user_agent: userAgent ?? null,
        allowed: true, reason: "WAF disabled",
      }).select("id").single();
      return { allowed: true, logId: log?.id };
    }

    // IP blocklist check
    if (blocked && (!blocked.blocked_until || new Date(blocked.blocked_until) > new Date())) {
      const { data: log } = await supabaseAdmin.from("requests_log").insert({
        ip, method: data.method, path: data.path, payload: data.body ?? null, user_agent: userAgent ?? null,
        allowed: false, category: "ip_block", severity: "high", reason: "IP is on blocklist",
      }).select("id").single();
      return { allowed: false, category: "ip_block", severity: "high", reason: "IP is on blocklist", logId: log?.id };
    }

    // Rule matching
    const haystack = `${data.method} ${data.path} ${data.body ?? ""}`;
    let matched: typeof rulesData extends Array<infer R> ? R : never | undefined;
    for (const rule of rulesData ?? []) {
      try {
        const re = new RegExp(rule.pattern);
        if (re.test(haystack)) { matched = rule as any; break; }
      } catch { /* skip bad regex */ }
    }

    if (matched) {
      const m: any = matched;
      const { data: log } = await supabaseAdmin.from("requests_log").insert({
        ip, method: data.method, path: data.path, payload: data.body ?? null, user_agent: userAgent ?? null,
        matched_rule_id: m.id, matched_rule_name: m.name, category: m.category, severity: m.severity,
        allowed: false, reason: `Matched rule: ${m.name}`,
      }).select("id").single();

      // Auto-block: count recent blocks for this IP
      const threshold = settings?.auto_block_threshold ?? 5;
      const { count } = await supabaseAdmin.from("requests_log")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip).eq("allowed", false)
        .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
      if ((count ?? 0) >= threshold) {
        await supabaseAdmin.from("blocked_ips").upsert(
          { ip, reason: `Auto-blocked after ${count} malicious requests`, blocked_until: new Date(Date.now() + 60 * 60_000).toISOString() },
          { onConflict: "ip" }
        );
      }

      return {
        allowed: false, matchedRuleId: m.id, matchedRuleName: m.name,
        category: m.category, severity: m.severity, reason: `Matched rule: ${m.name}`,
        logId: log?.id,
      };
    }

    const { data: log } = await supabaseAdmin.from("requests_log").insert({
      ip, method: data.method, path: data.path, payload: data.body ?? null, user_agent: userAgent ?? null,
      allowed: true,
    }).select("id").single();
    return { allowed: true, logId: log?.id };
  });

// ---------------- Public stats (for landing page) ----------------
export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } }
  );
  const { data, error } = await sb.rpc("get_public_stats");
  if (error || !data?.[0]) return { total_blocked: 0, total_requests: 0, active_rules: 0 };
  const row = data[0] as any;
  return {
    total_blocked: Number(row.total_blocked ?? 0),
    total_requests: Number(row.total_requests ?? 0),
    active_rules: Number(row.active_rules ?? 0),
  };
});

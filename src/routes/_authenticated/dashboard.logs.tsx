import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "./dashboard";
import type { Database } from "@/integrations/supabase/types";

type LogRow = Database["public"]["Tables"]["requests_log"]["Row"];

export const Route = createFileRoute("/_authenticated/dashboard/logs")({
  component: LogsPage,
});

const cats = ["all","sqli","xss","path_traversal","command_injection","lfi","rfi","ip_block","other"];

function LogsPage() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [ipFilter, setIpFilter] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    supabase.from("requests_log").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setLogs(data ?? []));
    const ch = supabase
      .channel("logs-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "requests_log" }, (p) => {
        setLogs((prev) => [p.new as LogRow, ...prev].slice(0, 500));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => logs.filter(l => {
    if (ipFilter && !l.ip.includes(ipFilter)) return false;
    if (cat !== "all" && l.category !== cat) return false;
    if (status === "blocked" && l.allowed) return false;
    if (status === "allowed" && !l.allowed) return false;
    return true;
  }), [logs, ipFilter, cat, status]);

  return (
    <div>
      <PageHeader title={t.dashboard.logs}>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="pulse-dot" /><span className="font-mono">{t.dashboard.live}</span>
        </span>
      </PageHeader>

      <div className="grid gap-3 p-6 md:grid-cols-[1fr_180px_180px]">
        <Input placeholder={t.dashboard.filterByIp} value={ipFilter} onChange={(e) => setIpFilter(e.target.value)} className="font-mono" />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {cats.map(c => <SelectItem key={c} value={c}>{c === "all" ? t.dashboard.all : (t.categories[c as keyof typeof t.categories] ?? c)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.dashboard.all}</SelectItem>
            <SelectItem value="blocked">{t.dashboard.blocked}</SelectItem>
            <SelectItem value="allowed">{t.dashboard.allowed}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="mx-6 mb-6 overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">{t.dashboard.time}</th>
                <th className="px-3 py-2 text-start">{t.dashboard.status}</th>
                <th className="px-3 py-2 text-start">{t.dashboard.method}</th>
                <th className="px-3 py-2 text-start">{t.dashboard.ip}</th>
                <th className="px-3 py-2 text-start">{t.dashboard.path}</th>
                <th className="px-3 py-2 text-start">{t.dashboard.category}</th>
                <th className="px-3 py-2 text-start">{t.dashboard.severity}</th>
                <th className="px-3 py-2 text-start">{t.dashboard.rule}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground tabular-nums">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {r.allowed
                      ? <Badge variant="outline" className="border-primary/40 text-primary">{t.dashboard.allowed}</Badge>
                      : <Badge variant="outline" className="border-destructive/40 text-destructive">{t.dashboard.blocked}</Badge>}
                  </td>
                  <td className="px-3 py-2">{r.method}</td>
                  <td className="px-3 py-2">{r.ip}</td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-muted-foreground">{r.path}</td>
                  <td className="px-3 py-2">{r.category ? (t.categories[r.category as keyof typeof t.categories] ?? r.category) : "—"}</td>
                  <td className="px-3 py-2">{r.severity ? t.severities[r.severity] : "—"}</td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-muted-foreground">{r.matched_rule_name ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">{t.dashboard.noAttacks}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

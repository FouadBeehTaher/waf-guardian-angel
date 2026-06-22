import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, ShieldAlert, ShieldCheck, ListChecks, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttackGlobe } from "@/components/AttackGlobe";
import { PageHeader } from "./dashboard";
import type { Database } from "@/integrations/supabase/types";

type LogRow = Database["public"]["Tables"]["requests_log"]["Row"];

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: OverviewPage,
});

function OverviewPage() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [activeRules, setActiveRules] = useState(0);

  useEffect(() => {
    supabase.from("requests_log").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setLogs(data ?? []));
    supabase.from("rules").select("id", { count: "exact", head: true }).eq("enabled", true)
      .then(({ count }) => setActiveRules(count ?? 0));

    const ch = supabase
      .channel("overview-logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "requests_log" }, (p) => {
        setLogs((prev) => [p.new as LogRow, ...prev].slice(0, 500));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const stats = useMemo(() => {
    const blocked = logs.filter(l => !l.allowed).length;
    const allowed = logs.filter(l => l.allowed).length;
    const total = logs.length;
    const byCat: Record<string, number> = {};
    logs.filter(l => !l.allowed && l.category).forEach(l => { byCat[l.category!] = (byCat[l.category!] ?? 0) + 1; });
    const topThreat = Object.entries(byCat).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "—";
    return { blocked, allowed, total, topThreat, blockRate: total ? Math.round((blocked / total) * 100) : 0 };
  }, [logs]);

  const recent = logs.filter(l => !l.allowed).slice(0, 10);

  return (
    <div>
      <PageHeader title={t.dashboard.overview}>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="pulse-dot" /> <span className="font-mono">{t.dashboard.live}</span>
        </span>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={Activity} label={t.dashboard.kpis.total} value={stats.total} />
        <KpiCard icon={ShieldAlert} label={t.dashboard.kpis.blocked} value={stats.blocked} accent="destructive" />
        <KpiCard icon={ShieldCheck} label={t.dashboard.kpis.allowed} value={stats.allowed} accent="primary" />
        <KpiCard icon={TrendingUp} label={t.dashboard.kpis.blockRate} value={`${stats.blockRate}%`} />
        <KpiCard icon={AlertTriangle} label={t.dashboard.kpis.topThreat} value={stats.topThreat} mono />
        <KpiCard icon={ListChecks} label={t.dashboard.kpis.activeRules} value={activeRules} />
      </div>

      <div className="px-6 pb-6">
        <AttackGlobe height={440} />
      </div>

      <Card className="mx-6 mb-6 overflow-hidden">
        <div className="border-b border-border bg-card/60 px-4 py-3 font-semibold">{t.dashboard.recentAttacks}</div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t.dashboard.noAttacks}</div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((r) => <AttackRow key={r.id} row={r} />)}
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent, mono }: { icon: any; label: string; value: number | string; accent?: "primary" | "destructive"; mono?: boolean }) {
  const color = accent === "destructive" ? "text-destructive" : accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`mt-2 text-2xl font-bold ${color} ${mono ? "font-mono" : "font-mono"}`}>{value}</div>
    </Card>
  );
}

function AttackRow({ row }: { row: LogRow }) {
  const { t } = useI18n();
  const sevColor = row.severity === "critical" ? "bg-destructive text-destructive-foreground"
    : row.severity === "high" ? "bg-destructive/80 text-destructive-foreground"
    : row.severity === "medium" ? "bg-[oklch(0.82_0.18_80)] text-background"
    : "bg-secondary text-secondary-foreground";
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{new Date(row.created_at).toLocaleTimeString()}</span>
      <Badge variant="outline" className="font-mono text-xs">{row.method}</Badge>
      <span className="font-mono text-xs">{row.ip}</span>
      <span className="truncate font-mono text-xs text-muted-foreground flex-1 min-w-[120px]">{row.path}</span>
      {row.category && <Badge variant="outline" className="text-xs">{t.categories[row.category as keyof typeof t.categories] ?? row.category}</Badge>}
      {row.severity && <Badge className={`text-xs ${sevColor}`}>{t.severities[row.severity]}</Badge>}
    </div>
  );
}

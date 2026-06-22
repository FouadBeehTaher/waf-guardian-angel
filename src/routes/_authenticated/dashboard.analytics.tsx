import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { PageHeader } from "./dashboard";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import type { Database } from "@/integrations/supabase/types";

type LogRow = Database["public"]["Tables"]["requests_log"]["Row"];

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  component: AnalyticsPage,
});

const COLORS = ["oklch(0.78 0.20 152)", "oklch(0.65 0.24 25)", "oklch(0.72 0.18 220)", "oklch(0.82 0.18 80)", "oklch(0.65 0.22 300)"];

function AnalyticsPage() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase.from("requests_log").select("*").gte("created_at", since).order("created_at")
      .then(({ data }) => setLogs(data ?? []));
  }, []);

  const overTime = useMemo(() => {
    const buckets: Record<string, { hour: string; allowed: number; blocked: number }> = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 3600 * 1000);
      const key = `${d.getHours()}:00`;
      buckets[key] = { hour: key, allowed: 0, blocked: 0 };
    }
    logs.forEach(l => {
      const d = new Date(l.created_at);
      const key = `${d.getHours()}:00`;
      if (buckets[key]) {
        if (l.allowed) buckets[key].allowed++; else buckets[key].blocked++;
      }
    });
    return Object.values(buckets);
  }, [logs]);

  const byCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    logs.filter(l => !l.allowed && l.category).forEach(l => { acc[l.category!] = (acc[l.category!] ?? 0) + 1; });
    return Object.entries(acc).map(([name, value]) => ({ name: t.categories[name as keyof typeof t.categories] ?? name, value }));
  }, [logs, t]);

  const bySeverity = useMemo(() => {
    const acc: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    logs.filter(l => !l.allowed && l.severity).forEach(l => { acc[l.severity!] = (acc[l.severity!] ?? 0) + 1; });
    return Object.entries(acc).map(([k, v]) => ({ name: t.severities[k as keyof typeof t.severities], value: v }));
  }, [logs, t]);

  const topIps = useMemo(() => {
    const acc: Record<string, number> = {};
    logs.filter(l => !l.allowed).forEach(l => { acc[l.ip] = (acc[l.ip] ?? 0) + 1; });
    return Object.entries(acc).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([ip, count]) => ({ ip, count }));
  }, [logs]);

  const topPaths = useMemo(() => {
    const acc: Record<string, number> = {};
    logs.filter(l => !l.allowed).forEach(l => { acc[l.path] = (acc[l.path] ?? 0) + 1; });
    return Object.entries(acc).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([path, count]) => ({ path, count }));
  }, [logs]);

  const axisStyle = { fontSize: 11, fill: "oklch(0.68 0.02 250)" };
  const tooltipStyle = { backgroundColor: "oklch(0.20 0.025 250)", border: "1px solid oklch(0.30 0.03 250)", borderRadius: 6, fontSize: 12 };

  return (
    <div>
      <PageHeader title={t.dashboard.analytics}>
        <span className="text-xs text-muted-foreground">{t.analytics.last24h}</span>
      </PageHeader>

      <div className="grid gap-4 p-6 lg:grid-cols-2">
        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-3 font-semibold">{t.analytics.requestsOverTime}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={overTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.03 250)" />
              <XAxis dataKey="hour" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="allowed" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="blocked" stroke={COLORS[1]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-semibold">{t.analytics.byCategory}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.03 250)" />
              <XAxis dataKey="name" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill={COLORS[1]} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-semibold">{t.analytics.bySeverity}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={bySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {bySeverity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-semibold">{t.analytics.topAttackers}</h3>
          <div className="space-y-1">
            {topIps.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">—</div>}
            {topIps.map((r) => (
              <div key={r.ip} className="flex items-center justify-between rounded px-2 py-1.5 text-sm font-mono hover:bg-secondary/30">
                <span>{r.ip}</span>
                <span className="text-destructive">{r.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-semibold">{t.analytics.topPaths}</h3>
          <div className="space-y-1">
            {topPaths.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">—</div>}
            {topPaths.map((r) => (
              <div key={r.path} className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm font-mono hover:bg-secondary/30">
                <span className="truncate">{r.path}</span>
                <span className="shrink-0 text-destructive">{r.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, ArrowRight, Activity, Filter, BarChart3, Ban, Zap, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPublicStats } from "@/lib/waf.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SentinelWAF — Open Web Application Firewall" },
      { name: "description", content: "Block SQLi, XSS, Path Traversal and more with a real-time dashboard and customizable rules." },
    ],
  }),
  component: Index,
});

const icons = [Activity, Filter, Shield, BarChart3, Ban, Zap];

function Index() {
  const { t, dir } = useI18n();
  const [stats, setStats] = useState({ total_blocked: 0, total_requests: 0, active_rules: 0 });

  useEffect(() => {
    getPublicStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 grid-bg">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono text-primary">
              <span className="pulse-dot" /> Graduation Project · 2026
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              {t.hero.title}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">{t.hero.subtitle}</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/simulator">
                <Button size="lg" className="gap-2 glow-primary">
                  {t.hero.cta} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button size="lg" variant="outline" className="gap-2">
                  <BookOpen className="h-4 w-4" /> {t.hero.ctaSecondary}
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: t.hero.stats.blocked, value: stats.total_blocked, color: "text-destructive" },
              { label: t.hero.stats.total, value: stats.total_requests, color: "text-primary" },
              { label: t.hero.stats.rules, value: stats.active_rules, color: "text-foreground" },
            ].map((s) => (
              <Card key={s.label} className="border-border/60 bg-card/60 p-6 text-center backdrop-blur">
                <div className={`font-mono text-4xl font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
                <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">{t.features.title}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((f, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Card key={f.t} className="group border-border/60 bg-card p-6 transition-colors hover:border-primary/50">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Architecture */}
      <section className="border-t border-border/60 bg-card/30">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold">{t.arch.title}</h2>
            <p className="mt-2 text-muted-foreground">{t.arch.subtitle}</p>
          </div>
          <Card className="mx-auto mt-10 max-w-4xl overflow-x-auto bg-background/60 p-6 font-mono text-xs leading-relaxed text-muted-foreground md:text-sm">
            <pre className="whitespace-pre">{`  Client / Simulator
        │  HTTP request
        ▼
  ┌──────────────────────────────┐
  │      WAF Engine              │       ┌────────────────────┐
  │  • Settings check            │──▶ allowed ─▶│ Protected Backend │
  │  • IP blocklist              │       └────────────────────┘
  │  • Regex rule matching       │
  │  • Auto-block escalation     │──▶ blocked ─▶  403 Forbidden
  └──────────┬───────────────────┘
             │  every request logged
             ▼
  ┌──────────────────────────────┐
  │  PostgreSQL (Lovable Cloud)  │
  │  rules · requests_log        │
  │  blocked_ips · settings      │
  └──────────┬───────────────────┘
             │  realtime stream
             ▼
       Admin Dashboard`}</pre>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>{t.appName} · {t.tagline}</span>
        </div>
      </footer>
    </div>
  );
}

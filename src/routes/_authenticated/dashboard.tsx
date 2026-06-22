import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LayoutDashboard, ScrollText, ListChecks, Ban, BarChart3, Settings, Shield, LogOut, Languages, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { t, lang, setLang, dir } = useI18n();
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const [theme, setTheme] = useState<"dark" | "light">(() =>
    typeof window !== "undefined" && localStorage.getItem("waf:theme") === "light" ? "light" : "dark"
  );
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    if (typeof window !== "undefined") localStorage.setItem("waf:theme", theme);
  }, [theme]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav: { to: string; label: string; icon: typeof LayoutDashboard }[] = [
    { to: "/dashboard", label: t.dashboard.overview, icon: LayoutDashboard },
    { to: "/dashboard/logs", label: t.dashboard.logs, icon: ScrollText },
    { to: "/dashboard/rules", label: t.dashboard.rules, icon: ListChecks },
    { to: "/dashboard/blocked-ips", label: t.dashboard.blockedIps, icon: Ban },
    { to: "/dashboard/analytics", label: t.dashboard.analytics, icon: BarChart3 },
    { to: "/dashboard/settings", label: t.dashboard.settings, icon: Settings },
  ];

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{t.common.loading}</div>;
  }
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="max-w-md text-muted-foreground">{t.auth.notAdmin}</p>
        <Button onClick={signOut} variant="outline">{t.auth.signOut}</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background" dir={dir}>
      <aside className="hidden w-64 flex-col border-e border-border bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-semibold text-glow">{t.appName}</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = path === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3 text-xs">
          <div className="mb-2 truncate font-mono text-muted-foreground">{user?.email}</div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-8 flex-1" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
              <Languages className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 flex-1" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 flex-1" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="border-b border-border md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><span className="font-semibold">{t.appName}</span></div>
            <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2">
            {nav.map((item) => (
              <Link key={item.to} to={item.to as any} className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs hover:bg-sidebar-accent [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/30 px-6 py-5">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

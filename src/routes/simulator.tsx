import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, Play, Loader2 } from "lucide-react";
import { inspectRequest, type InspectResult } from "@/lib/waf.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/simulator")({
  head: () => ({ meta: [{ title: "Attack Simulator — SentinelWAF" }] }),
  component: SimPage,
});

const presets: { label: string; method: string; path: string; body: string }[] = [
  { label: "SQLi — UNION SELECT", method: "GET", path: "/api/users", body: "id=1 UNION SELECT username,password FROM users" },
  { label: "SQLi — OR 1=1", method: "POST", path: "/login", body: "username=admin' OR 1=1 --&password=x" },
  { label: "XSS — script tag", method: "GET", path: "/search", body: "q=<script>alert(1)</script>" },
  { label: "XSS — img onerror", method: "POST", path: "/comment", body: 'text=<img src=x onerror="alert(1)">' },
  { label: "Path Traversal", method: "GET", path: "/file", body: "name=../../../../etc/passwd" },
  { label: "Command Injection", method: "POST", path: "/ping", body: "host=8.8.8.8; cat /etc/passwd" },
  { label: "LFI — php wrapper", method: "GET", path: "/load", body: "file=php://filter/convert.base64-encode/resource=index" },
  { label: "Clean request", method: "GET", path: "/api/products", body: "category=shoes&page=2" },
];

function SimPage() {
  const { t, dir } = useI18n();
  const inspect = useServerFn(inspectRequest);
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/api/users");
  const [body, setBody] = useState("id=1");
  const [result, setResult] = useState<InspectResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await inspect({ data: { method, path, body } });
      setResult(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <SiteHeader />
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t.sim.title}</h1>
          <p className="mt-2 text-muted-foreground">{t.sim.subtitle}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold">{t.sim.presets}</h2>
            <div className="mb-6 flex flex-wrap gap-2">
              {presets.map((p) => (
                <button key={p.label}
                  onClick={() => { setMethod(p.method); setPath(p.path); setBody(p.body); }}
                  className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-mono hover:border-primary/50 hover:bg-secondary/80">
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["GET","POST","PUT","DELETE","PATCH"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/api/path" className="font-mono" />
              </div>
              <div>
                <Label>{t.sim.body}</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="font-mono text-sm" />
              </div>
              <Button onClick={run} disabled={loading} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {t.sim.run}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-semibold">{t.sim.result}</h2>
            {!result ? (
              <p className="text-sm text-muted-foreground">{t.sim.noRun}</p>
            ) : (
              <div className="space-y-4">
                <div className={`flex items-center gap-3 rounded-md border p-4 ${
                  result.allowed
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}>
                  {result.allowed ? <Shield className="h-8 w-8" /> : <ShieldAlert className="h-8 w-8" />}
                  <div>
                    <div className="text-2xl font-bold font-mono">
                      {result.allowed ? t.sim.verdictAllowed : t.sim.verdictBlocked}
                    </div>
                    {result.severity && (
                      <div className="text-xs uppercase">{t.severities[result.severity]}</div>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-border bg-secondary/40 p-4">
                  <div className="text-xs uppercase text-muted-foreground">{t.sim.matched}</div>
                  {result.matchedRuleName ? (
                    <div className="mt-1 space-y-2">
                      <div className="font-mono text-sm font-semibold">{result.matchedRuleName}</div>
                      {result.category && <Badge variant="outline" className="font-mono text-xs">{result.category}</Badge>}
                      {result.reason && <p className="text-xs text-muted-foreground">{result.reason}</p>}
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-muted-foreground">{t.sim.noMatch}</div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import type { Database } from "@/integrations/supabase/types";

type Rule = Database["public"]["Tables"]["rules"]["Row"];
type Cat = Database["public"]["Enums"]["attack_category"];
type Sev = Database["public"]["Enums"]["attack_severity"];

export const Route = createFileRoute("/_authenticated/dashboard/rules")({
  component: RulesPage,
});

const cats: Cat[] = ["sqli","xss","path_traversal","command_injection","lfi","rfi","other"];
const sevs: Sev[] = ["low","medium","high","critical"];

function RulesPage() {
  const { t } = useI18n();
  const [rules, setRules] = useState<Rule[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Rule> | null>(null);

  async function load() {
    const { data } = await supabase.from("rules").select("*").order("category").order("name");
    setRules(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function toggle(r: Rule) {
    await supabase.from("rules").update({ enabled: !r.enabled }).eq("id", r.id);
    load();
  }

  async function save() {
    if (!editing) return;
    const payload = {
      name: editing.name!, description: editing.description ?? null,
      category: editing.category as Cat, pattern: editing.pattern!,
      severity: (editing.severity ?? "medium") as Sev, enabled: editing.enabled ?? true,
    };
    try { new RegExp(payload.pattern); } catch { toast.error("Invalid regex pattern"); return; }
    const { isPatternSafe } = await import("@/lib/waf.functions");
    const safety = isPatternSafe(payload.pattern);
    if (!safety.ok) { toast.error(`Unsafe pattern: ${safety.reason}`); return; }
    if (editing.id) {
      const { error } = await supabase.from("rules").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("rules").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success(t.rules.saved);
    setOpen(false); setEditing(null); load();
  }

  async function remove(r: Rule) {
    if (!confirm(t.rules.confirmDelete)) return;
    await supabase.from("rules").delete().eq("id", r.id);
    toast.success(t.rules.deleted);
    load();
  }

  return (
    <div>
      <PageHeader title={t.dashboard.rules}>
        <Button size="sm" onClick={() => { setEditing({ enabled: true, severity: "medium", category: "sqli" }); setOpen(true); }}>
          <Plus className="h-4 w-4 me-1" /> {t.rules.add}
        </Button>
      </PageHeader>

      <div className="grid gap-3 p-6 lg:grid-cols-2">
        {rules.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{r.name}</h3>
                  <Badge variant="outline" className="text-xs">{t.categories[r.category]}</Badge>
                  <Badge className={`text-xs ${r.severity === "critical" || r.severity === "high" ? "bg-destructive/80 text-destructive-foreground" : ""}`}>{t.severities[r.severity]}</Badge>
                  {r.is_builtin && <Badge variant="secondary" className="text-xs">{t.rules.builtin}</Badge>}
                </div>
                {r.description && <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>}
                <code className="mt-2 block overflow-x-auto rounded bg-secondary/50 px-2 py-1 font-mono text-xs">{r.pattern}</code>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Switch checked={r.enabled} onCheckedChange={() => toggle(r)} />
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? t.rules.edit : t.rules.add}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>{t.rules.name}</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>{t.rules.description}</Label><Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t.dashboard.category}</Label>
                  <Select value={editing.category ?? "sqli"} onValueChange={(v) => setEditing({ ...editing, category: v as Cat })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{cats.map(c => <SelectItem key={c} value={c}>{t.categories[c]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t.dashboard.severity}</Label>
                  <Select value={editing.severity ?? "medium"} onValueChange={(v) => setEditing({ ...editing, severity: v as Sev })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{sevs.map(s => <SelectItem key={s} value={s}>{t.severities[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{t.rules.pattern}</Label><Textarea rows={3} className="font-mono text-sm" value={editing.pattern ?? ""} onChange={(e) => setEditing({ ...editing, pattern: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.enabled ?? true} onCheckedChange={(v) => setEditing({ ...editing, enabled: v })} /><Label>{t.rules.enabled}</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={save}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

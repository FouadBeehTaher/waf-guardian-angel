import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Ban } from "lucide-react";
import { PageHeader } from "./dashboard";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["blocked_ips"]["Row"];

export const Route = createFileRoute("/_authenticated/dashboard/blocked-ips")({
  component: BlockedPage,
});

function BlockedPage() {
  const { t } = useI18n();
  const [list, setList] = useState<Row[]>([]);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    const { data } = await supabase.from("blocked_ips").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("blocked-ips")
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_ips" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function add() {
    if (!ip) return;
    const { error } = await supabase.from("blocked_ips").upsert({ ip, reason: reason || "Manual block", blocked_until: null }, { onConflict: "ip" });
    if (error) toast.error(error.message);
    else { toast.success("IP blocked"); setIp(""); setReason(""); }
  }

  async function remove(id: string) {
    await supabase.from("blocked_ips").delete().eq("id", id);
    toast.success("Unblocked");
  }

  return (
    <div>
      <PageHeader title={t.dashboard.blockedIps} />
      <div className="p-6">
        <Card className="mb-6 p-4">
          <div className="grid gap-3 md:grid-cols-[200px_1fr_auto]">
            <Input placeholder="192.168.1.1" value={ip} onChange={(e) => setIp(e.target.value)} className="font-mono" />
            <Input placeholder={t.dashboard.reason} value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button onClick={add}><Plus className="me-1 h-4 w-4" />{t.blocked.add}</Button>
          </div>
        </Card>

        {list.length === 0 ? (
          <div className="rounded-md border border-border bg-card/50 p-12 text-center text-muted-foreground">
            <Ban className="mx-auto mb-3 h-10 w-10 opacity-50" />
            {t.blocked.noBlocked}
          </div>
        ) : (
          <div className="grid gap-2">
            {list.map((b) => (
              <Card key={b.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                  <Ban className="h-4 w-4 text-destructive" />
                  <span className="font-mono font-semibold">{b.ip}</span>
                  <span className="text-xs text-muted-foreground">{b.reason}</span>
                  {b.blocked_until && <Badge variant="outline" className="text-xs">{t.blocked.until} {new Date(b.blocked_until).toLocaleString()}</Badge>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "./dashboard";
import { toast } from "sonner";
import { testTelegram } from "@/lib/waf.functions";
import { useServerFn } from "@tanstack/react-start";
import { Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(true);
  const [rateLimit, setRateLimit] = useState(60);
  const [autoBlock, setAutoBlock] = useState(5);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const sendTest = useServerFn(testTelegram);

  useEffect(() => {
    supabase.from("waf_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) {
        setEnabled(data.enabled);
        setRateLimit(data.rate_limit_per_min);
        setAutoBlock(data.auto_block_threshold);
      }
    });
  }, []);

  async function save() {
    const { error } = await supabase.from("waf_settings").update({
      enabled, rate_limit_per_min: rateLimit, auto_block_threshold: autoBlock, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) toast.error(error.message);
    else toast.success(t.settings.saved);
  }

  async function handleTestTelegram() {
    setTestingTelegram(true);
    try {
      const result = await sendTest();
      if (result.ok) {
        toast.success(t.settings.testTelegramSent);
      } else {
        toast.error(`${t.settings.testTelegramFailed}: ${result.error}`);
      }
    } catch (e: any) {
      toast.error(`${t.settings.testTelegramFailed}: ${e.message}`);
    } finally {
      setTestingTelegram(false);
    }
  }

  return (
    <div>
      <PageHeader title={t.settings.title} />
      <div className="p-6 space-y-6">
        <Card className="max-w-xl space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">{t.settings.enabled}</Label>
              <p className="text-xs text-muted-foreground">When disabled, all requests pass through.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div>
            <Label>{t.settings.rateLimit}</Label>
            <Input type="number" min={1} value={rateLimit} onChange={(e) => setRateLimit(Number(e.target.value))} className="mt-2 font-mono" />
          </div>
          <div>
            <Label>{t.settings.autoBlock}</Label>
            <Input type="number" min={1} value={autoBlock} onChange={(e) => setAutoBlock(Number(e.target.value))} className="mt-2 font-mono" />
          </div>
          <Button onClick={save} className="w-full">{t.settings.save}</Button>
        </Card>

        <Card className="max-w-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Telegram</Label>
              <p className="text-xs text-muted-foreground">Send a test message to verify the bot token and chat ID.</p>
            </div>
            <Button variant="outline" onClick={handleTestTelegram} disabled={testingTelegram} className="gap-2">
              <Send className="h-4 w-4" />
              {testingTelegram ? "Sending..." : t.settings.testTelegram}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

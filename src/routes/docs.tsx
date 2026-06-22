import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — SentinelWAF" },
      { name: "description", content: "Project documentation: abstract, architecture, detection categories, and results." },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const { t, dir } = useI18n();
  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-16">
        <div className="mb-10 flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary"><BookOpen className="h-6 w-6" /></div>
          <h1 className="text-3xl font-bold">{t.docs.title}</h1>
        </div>
        <div className="space-y-6">
          {t.docs.sections.map((s) => (
            <Card key={s.t} className="p-6">
              <h2 className="font-semibold text-primary">{s.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

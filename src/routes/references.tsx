import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Github, BookOpen } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/references")({
  head: () => ({
    meta: [
      { title: "References — SentinelWAF" },
      { name: "description", content: "Academic references and open-source projects that inspired SentinelWAF." },
      { property: "og:title", content: "References — SentinelWAF" },
      { property: "og:description", content: "Academic references and open-source projects that inspired SentinelWAF." },
    ],
  }),
  component: ReferencesPage,
});

interface RefItem {
  title: string;
  url: string;
  authorEn: string;
  authorAr: string;
  descEn: string;
  descAr: string;
  borrowed: { en: string; ar: string }[];
}

const REFS: RefItem[] = [
  {
    title: "SafeLine (chaitin/SafeLine fork)",
    url: "https://github.com/FouadBeehTaher/SafeLine",
    authorEn: "Chaitin Tech · forked by FouadBeehTaher",
    authorAr: "Chaitin Tech · فرع بواسطة FouadBeehTaher",
    descEn:
      "A production-grade reverse-proxy WAF (Go + C++ + Lua) used in 180,000+ installations. Detects SQLi, XSS, CMDi, CRLF, SSRF, XXE, Path Traversal, RCE, LFI/RFI and ships an anti-bot CAPTCHA layer.",
    descAr:
      "WAF إنتاجي يعتمد على Reverse Proxy (Go + C++ + Lua) مستخدم في أكثر من 180,000 تثبيت. يكشف SQLi, XSS, CMDi, CRLF, SSRF, XXE, Path Traversal, RCE, LFI/RFI ويوفر طبقة CAPTCHA ضد البوتات.",
    borrowed: [
      { en: "Effect-evaluation table format (Detection %, FP %, Accuracy %)", ar: "تنسيق جدول تقييم الأداء (نسبة الكشف، نسبة الإنذار الخاطئ، الدقة)" },
      { en: "Dashboard layout inspiration: attack event log + traffic graphs", ar: "إلهام تخطيط لوحة التحكم: سجل الأحداث + الرسوم البيانية" },
    ],
  },
  {
    title: "waff-app-new (AI-WAF)",
    url: "https://github.com/fouadbehtaher/waff-app-new",
    authorEn: "Fouad Behtaher",
    authorAr: "فؤاد بهتاهر",
    descEn:
      "Python/FastAPI WAF with 106 detection patterns across 9 categories (SQLi, XSS, DOM-XSS, SSTI, SSI, XXE, CMDi, LFI/RFI, File Upload), ML classifier, behavioral analysis, and automatic signature generation.",
    descAr:
      "WAF مبني بـPython/FastAPI يحتوي على 106 نمط كشف موزعة على 9 فئات (SQLi, XSS, DOM-XSS, SSTI, SSI, XXE, CMDi, LFI/RFI, File Upload)، مع تصنيف ML، تحليل سلوكي، وتوليد توقيعات تلقائي.",
    borrowed: [
      { en: "9-category attack taxonomy (added SSTI, XXE, DOM-XSS, SSI, File Upload, File Inclusion to enum)", ar: "تصنيف 9 فئات للهجمات (أُضيف SSTI, XXE, DOM-XSS, SSI, File Upload, File Inclusion)" },
      { en: "Weighted threat-score model (rule weight × match → score ≥ threshold blocks)", ar: "نموذج درجة التهديد المرجّحة (وزن القاعدة × التطابق ← الحظر عند تجاوز العتبة)" },
      { en: "Multi-tab dashboard layout (Overview, Logs, Rules, Blocked IPs, Analytics, Settings)", ar: "تخطيط لوحة تحكم متعدد التبويبات" },
    ],
  },
  {
    title: "Web-Application-Firewall-WAF-1 (OUTERLOOP)",
    url: "https://github.com/fouadbehtaher/Web-Application-Firewall-WAF-1",
    authorEn: "obstinix · forked by fouadbehtaher",
    authorAr: "obstinix · فرع بواسطة fouadbehtaher",
    descEn:
      "FastAPI middleware WAF with 35+ concrete regex patterns covering OWASP Top 10. Includes a Three.js attack-origin 3D globe and multi-pass request decoding to defeat evasion (URL → base64 → HTML entity → double-encode).",
    descAr:
      "WAF يعمل كـMiddleware في FastAPI ويحتوي على أكثر من 35 نمط regex جاهز يغطي OWASP Top 10. يتضمن كرة أرضية ثلاثية الأبعاد بـThree.js لمصادر الهجمات وفك تشفير متعدد المراحل لمنع التهرب (URL → base64 → HTML entity → double-encode).",
    borrowed: [
      { en: "Concrete regex patterns for SQLi, XSS, Path Traversal, CMDi seeded into the rules table", ar: "أنماط Regex الجاهزة لـSQLi, XSS, Path Traversal, CMDi تم إدراجها في جدول القواعد" },
      { en: "Multi-pass decoding pipeline before pattern matching (anti-evasion)", ar: "خط فك التشفير متعدد المراحل قبل المطابقة (ضد التهرب)" },
      { en: "3D attack-origin globe (react-globe.gl) on the Overview dashboard", ar: "الكرة الأرضية ثلاثية الأبعاد لمصادر الهجمات على شاشة النظرة العامة" },
    ],
  },
];

function ReferencesPage() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span className="font-mono uppercase tracking-wider">{isAr ? "المراجع" : "References"}</span>
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">
            {isAr ? "المصادر والمشاريع الملهِمة" : "Sources & Inspirational Projects"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {isAr
              ? "هذه قائمة المشاريع مفتوحة المصدر التي تأثر بها " + t.appName + " — من قواعد الكشف إلى تصميم لوحة التحكم."
              : `Open-source projects that ${t.appName} draws on — from detection rules to dashboard UX.`}
          </p>
        </div>

        <div className="space-y-5">
          {REFS.map((r) => (
            <Card key={r.url} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <Github className="h-5 w-5 text-primary" />
                    {r.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">{isAr ? r.authorAr : r.authorEn}</p>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono hover:bg-accent"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  GitHub
                </a>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {isAr ? r.descAr : r.descEn}
              </p>
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  {isAr ? "ما تم الاستفادة منه" : "What we adapted"}
                </div>
                <ul className="space-y-1.5">
                  {r.borrowed.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <Badge variant="outline" className="mt-0.5 h-5 shrink-0 px-1.5 font-mono text-[10px]">
                        {String(i + 1).padStart(2, "0")}
                      </Badge>
                      <span>{isAr ? b.ar : b.en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-border bg-card/40 p-5 text-sm text-muted-foreground">
          <strong className="text-foreground">{isAr ? "ملاحظة أكاديمية:" : "Academic note:"}</strong>{" "}
          {isAr
            ? "جميع الأكواد المُعاد كتابتها داخل هذا المشروع هي ترجمة وإعادة هندسة بلغة TypeScript/React على بنية TanStack Start + قاعدة بيانات. لم يُنسخ كود مباشرة من المصادر أعلاه."
            : "All code in this project is a re-implementation in TypeScript/React on TanStack Start + a managed database. No source code was copied verbatim from the projects above."}
        </div>
      </main>
    </div>
  );
}

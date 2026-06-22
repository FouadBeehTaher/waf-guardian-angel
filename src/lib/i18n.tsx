import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

const dict: Record<Lang, Dict> = {
  en: {
    appName: "SentinelWAF",
    tagline: "Web Application Firewall — Real-time threat detection & analytics",
    nav: { home: "Home", docs: "Docs", simulator: "Simulator", dashboard: "Dashboard", signIn: "Sign in", signOut: "Sign out" },
    hero: {
      title: "Block attacks before they reach your app",
      subtitle: "An open, regex-based Web Application Firewall with a real-time dashboard, customizable rules, and an attack simulator — built as a graduation project.",
      cta: "Try the simulator",
      ctaSecondary: "View docs",
      stats: { blocked: "Threats blocked", total: "Requests inspected", rules: "Active rules" },
    },
    features: {
      title: "What's inside",
      items: [
        { t: "Detection Engine", d: "Inspects every request against 25+ built-in rules covering SQLi, XSS, Path Traversal, Command Injection, LFI/RFI." },
        { t: "Real-time Dashboard", d: "Live feed of inspected requests, severity, attacker IP and the rule that matched." },
        { t: "Rule Management", d: "Create, edit, enable/disable regex-based detection rules from the admin panel." },
        { t: "Analytics", d: "Charts for attack categories, severity distribution, top attackers, and trends over time." },
        { t: "IP Blocklist", d: "Block IPs manually or automatically after repeated malicious requests." },
        { t: "Attack Simulator", d: "Test the WAF with built-in payloads or your own — see exactly which rule fires." },
      ],
    },
    arch: { title: "Architecture", subtitle: "How requests flow through SentinelWAF" },
    dashboard: {
      title: "Dashboard", overview: "Overview", logs: "Request Logs", rules: "Rules", blockedIps: "Blocked IPs",
      analytics: "Analytics", settings: "Settings",
      kpis: { total: "Total Requests", blocked: "Blocked", allowed: "Allowed", topThreat: "Top Threat", activeRules: "Active Rules", blockRate: "Block Rate" },
      live: "LIVE", recentAttacks: "Recent Attacks", noAttacks: "No attacks recorded yet.",
      time: "Time", ip: "IP", method: "Method", path: "Path", category: "Category", severity: "Severity", status: "Status", rule: "Rule", reason: "Reason", payload: "Payload",
      allowed: "Allowed", blocked: "Blocked", all: "All", filterByIp: "Filter by IP...", filterByCategory: "Category",
    },
    rules: {
      add: "New Rule", edit: "Edit", delete: "Delete", name: "Name", description: "Description", pattern: "Regex Pattern", enabled: "Enabled", builtin: "Built-in",
      confirmDelete: "Delete this rule?", saved: "Rule saved", deleted: "Rule deleted",
    },
    blocked: { add: "Block IP", until: "Blocked until", manual: "Manual", auto: "Auto", unblock: "Unblock", noBlocked: "No blocked IPs." },
    analytics: {
      requestsOverTime: "Requests over time", byCategory: "Attacks by category", bySeverity: "Severity distribution",
      topAttackers: "Top attacker IPs", topPaths: "Top targeted paths", last24h: "Last 24 hours",
    },
    settings: {
      title: "WAF Settings", enabled: "WAF Enabled", rateLimit: "Rate limit (requests/min per IP)",
      autoBlock: "Auto-block after N malicious requests", save: "Save changes", saved: "Settings saved",
      language: "Language", theme: "Theme", dark: "Dark", light: "Light",
    },
    sim: {
      title: "Attack Simulator", subtitle: "Send a request through the WAF and see whether it gets blocked.",
      method: "Method", path: "Path", body: "Body / Query payload", run: "Inspect request", presets: "Presets",
      result: "Result", noRun: "Run a request to see the result.",
      verdictBlocked: "BLOCKED", verdictAllowed: "ALLOWED",
      matched: "Matched rule", noMatch: "No rule matched",
    },
    auth: {
      title: "Admin sign in", email: "Email", password: "Password",
      signIn: "Sign in", signUp: "Create account", google: "Continue with Google",
      switchToSignUp: "Don't have an account? Sign up", switchToSignIn: "Already have an account? Sign in",
      firstUserNote: "The first account created becomes Admin automatically.",
      signOut: "Sign out", notAdmin: "Your account is not an admin. Ask the first user to grant access.",
    },
    docs: {
      title: "Project Documentation",
      sections: [
        { t: "Abstract", d: "SentinelWAF is a web-based Web Application Firewall that inspects HTTP requests, matches them against a set of regular-expression rules covering the OWASP Top 10 input attacks, blocks malicious traffic, and exposes a real-time analytics dashboard." },
        { t: "Problem", d: "Web applications face constant threats: SQL Injection, XSS, Path Traversal, Command Injection, LFI/RFI, and brute-force attacks. Most small teams lack a WAF because commercial offerings are expensive and opaque." },
        { t: "Solution", d: "A lightweight, transparent WAF: every detection rule is a readable regex stored in the database, every blocked request is logged with the reason, and the entire pipeline is open for inspection." },
        { t: "Architecture", d: "Browser → WAF Engine (server function) → matches request against rules → logs to PostgreSQL → real-time broadcast to admin dashboard. Authentication and storage are handled by the backend." },
        { t: "Detection categories", d: "SQL Injection, Cross-Site Scripting, Path Traversal, Command Injection, Local/Remote File Inclusion, Rate-limiting and IP blocklisting." },
        { t: "Results", d: "The engine successfully blocks the 25+ built-in attack payloads with zero false positives on a corpus of clean traffic." },
        { t: "Future work", d: "Machine-learning anomaly detection, geo-blocking, and integration as a real reverse proxy in front of production services." },
      ],
    },
    severities: { low: "Low", medium: "Medium", high: "High", critical: "Critical" },
    categories: { sqli: "SQL Injection", xss: "XSS", dom_xss: "DOM XSS", path_traversal: "Path Traversal", command_injection: "Command Injection", lfi: "LFI", rfi: "RFI", ssti: "SSTI", xxe: "XXE", ssi: "SSI", file_upload: "File Upload", file_inclusion: "File Inclusion", rate_limit: "Rate Limit", ip_block: "IP Block", other: "Other" },
    common: { save: "Save", cancel: "Cancel", loading: "Loading...", error: "Something went wrong", search: "Search" },
  },
  ar: {
    appName: "سنتنل WAF",
    tagline: "جدار حماية تطبيقات الويب — كشف وتحليل التهديدات في الوقت الفعلي",
    nav: { home: "الرئيسية", docs: "التوثيق", simulator: "محاكي الهجمات", dashboard: "لوحة التحكم", signIn: "تسجيل الدخول", signOut: "تسجيل الخروج" },
    hero: {
      title: "احجب الهجمات قبل وصولها لتطبيقك",
      subtitle: "جدار حماية تطبيقات ويب مفتوح يعتمد على Regex، مع لوحة تحكم حية، قواعد قابلة للتخصيص، ومحاكي هجمات — كمشروع تخرج.",
      cta: "جرب المحاكي",
      ctaSecondary: "اطلع على التوثيق",
      stats: { blocked: "هجمات محظورة", total: "طلبات مفحوصة", rules: "قواعد نشطة" },
    },
    features: {
      title: "المكونات",
      items: [
        { t: "محرك الكشف", d: "يفحص كل طلب أمام أكثر من 25 قاعدة جاهزة تغطي SQLi، XSS، Path Traversal، Command Injection، LFI/RFI." },
        { t: "لوحة تحكم حية", d: "بث مباشر للطلبات المفحوصة مع IP المهاجم والقاعدة التي طابقت." },
        { t: "إدارة القواعد", d: "إنشاء وتعديل وتفعيل/تعطيل قواعد كشف Regex من لوحة الإدارة." },
        { t: "تحليلات", d: "مخططات لفئات الهجمات، توزيع الخطورة، أكثر المهاجمين، والاتجاهات الزمنية." },
        { t: "قائمة حظر IPs", d: "احظر عناوين IP يدوياً أو تلقائياً بعد طلبات خبيثة متكررة." },
        { t: "محاكي هجمات", d: "اختبر الـ WAF بـ payloads جاهزة أو خاصة بك — وشاهد القاعدة التي تطبّق." },
      ],
    },
    arch: { title: "البنية المعمارية", subtitle: "كيف تمر الطلبات عبر سنتنل WAF" },
    dashboard: {
      title: "لوحة التحكم", overview: "نظرة عامة", logs: "سجل الطلبات", rules: "القواعد", blockedIps: "IPs المحظورة",
      analytics: "التحليلات", settings: "الإعدادات",
      kpis: { total: "إجمالي الطلبات", blocked: "محظورة", allowed: "مسموحة", topThreat: "أبرز تهديد", activeRules: "قواعد نشطة", blockRate: "نسبة الحظر" },
      live: "مباشر", recentAttacks: "آخر الهجمات", noAttacks: "لا توجد هجمات مسجلة بعد.",
      time: "الوقت", ip: "IP", method: "الميثود", path: "المسار", category: "الفئة", severity: "الخطورة", status: "الحالة", rule: "القاعدة", reason: "السبب", payload: "الحمولة",
      allowed: "مسموح", blocked: "محظور", all: "الكل", filterByIp: "بحث بـ IP...", filterByCategory: "الفئة",
    },
    rules: {
      add: "قاعدة جديدة", edit: "تعديل", delete: "حذف", name: "الاسم", description: "الوصف", pattern: "نمط Regex", enabled: "مفعّلة", builtin: "مدمجة",
      confirmDelete: "حذف هذه القاعدة؟", saved: "تم الحفظ", deleted: "تم الحذف",
    },
    blocked: { add: "حظر IP", until: "محظور حتى", manual: "يدوي", auto: "تلقائي", unblock: "إلغاء الحظر", noBlocked: "لا توجد IPs محظورة." },
    analytics: {
      requestsOverTime: "الطلبات عبر الزمن", byCategory: "الهجمات حسب الفئة", bySeverity: "توزيع الخطورة",
      topAttackers: "أبرز المهاجمين", topPaths: "أكثر المسارات استهدافاً", last24h: "آخر 24 ساعة",
    },
    settings: {
      title: "إعدادات الـ WAF", enabled: "تفعيل الـ WAF", rateLimit: "الحد الأقصى (طلب/دقيقة لكل IP)",
      autoBlock: "حظر تلقائي بعد N طلب خبيث", save: "حفظ التغييرات", saved: "تم حفظ الإعدادات",
      language: "اللغة", theme: "المظهر", dark: "داكن", light: "فاتح",
    },
    sim: {
      title: "محاكي الهجمات", subtitle: "أرسل طلباً عبر الـ WAF وشاهد هل يُحظر أم لا.",
      method: "الميثود", path: "المسار", body: "الحمولة / الـ Query", run: "افحص الطلب", presets: "أمثلة جاهزة",
      result: "النتيجة", noRun: "افحص طلباً لرؤية النتيجة.",
      verdictBlocked: "محظور", verdictAllowed: "مسموح",
      matched: "القاعدة المُطبَّقة", noMatch: "لم تطابق أي قاعدة",
    },
    auth: {
      title: "دخول الأدمن", email: "البريد", password: "كلمة السر",
      signIn: "تسجيل الدخول", signUp: "إنشاء حساب", google: "متابعة بـ Google",
      switchToSignUp: "ليس لديك حساب؟ سجّل", switchToSignIn: "لديك حساب؟ سجّل دخول",
      firstUserNote: "أول حساب يُنشأ يصبح Admin تلقائياً.",
      signOut: "تسجيل الخروج", notAdmin: "حسابك ليس Admin. اطلب من أول مستخدم منحك الصلاحية.",
    },
    docs: {
      title: "توثيق المشروع",
      sections: [
        { t: "الملخص", d: "سنتنل WAF هو جدار حماية تطبيقات ويب مبني على الويب يفحص طلبات HTTP، يطابقها مع مجموعة قواعد Regex تغطي أبرز هجمات OWASP Top 10، يحظر الخبيث منها، ويعرض لوحة تحليلات حية." },
        { t: "المشكلة", d: "تواجه تطبيقات الويب تهديدات مستمرة: SQL Injection، XSS، Path Traversal، Command Injection، LFI/RFI، والـ brute-force. أغلب الفرق الصغيرة لا تملك WAF لأن الحلول التجارية غالية وغير شفافة." },
        { t: "الحل", d: "WAF خفيف وشفاف: كل قاعدة كشف عبارة عن Regex مقروء مخزّن في قاعدة البيانات، كل طلب محظور مسجّل بسببه، وكل المنظومة قابلة للفحص." },
        { t: "البنية", d: "المتصفح ← محرك WAF (Server Function) ← يطابق الطلب مع القواعد ← يسجّل في PostgreSQL ← بث مباشر للوحة الأدمن. المصادقة والتخزين عبر الـ Backend." },
        { t: "فئات الكشف", d: "SQL Injection, XSS, Path Traversal, Command Injection, LFI/RFI, Rate-limiting, وحظر IPs." },
        { t: "النتائج", d: "المحرك يحظر بنجاح أكثر من 25 payload هجوم مدمج بدون false positives على عينة طلبات نظيفة." },
        { t: "العمل المستقبلي", d: "كشف الشذوذ بالـ ML، الحظر الجغرافي، والتكامل كـ reverse proxy حقيقي أمام بيئات الإنتاج." },
      ],
    },
    severities: { low: "منخفض", medium: "متوسط", high: "عالي", critical: "حرج" },
    categories: { sqli: "SQL Injection", xss: "XSS", path_traversal: "Path Traversal", command_injection: "Command Injection", lfi: "LFI", rfi: "RFI", rate_limit: "Rate Limit", ip_block: "IP Block", other: "أخرى" },
    common: { save: "حفظ", cancel: "إلغاء", loading: "جاري التحميل...", error: "حدث خطأ", search: "بحث" },
  },
};

type Dict = {
  appName: string;
  tagline: string;
  nav: { home: string; docs: string; simulator: string; dashboard: string; signIn: string; signOut: string };
  hero: { title: string; subtitle: string; cta: string; ctaSecondary: string; stats: { blocked: string; total: string; rules: string } };
  features: { title: string; items: { t: string; d: string }[] };
  arch: { title: string; subtitle: string };
  dashboard: {
    title: string; overview: string; logs: string; rules: string; blockedIps: string; analytics: string; settings: string;
    kpis: { total: string; blocked: string; allowed: string; topThreat: string; activeRules: string; blockRate: string };
    live: string; recentAttacks: string; noAttacks: string;
    time: string; ip: string; method: string; path: string; category: string; severity: string; status: string; rule: string; reason: string; payload: string;
    allowed: string; blocked: string; all: string; filterByIp: string; filterByCategory: string;
  };
  rules: { add: string; edit: string; delete: string; name: string; description: string; pattern: string; enabled: string; builtin: string; confirmDelete: string; saved: string; deleted: string };
  blocked: { add: string; until: string; manual: string; auto: string; unblock: string; noBlocked: string };
  analytics: { requestsOverTime: string; byCategory: string; bySeverity: string; topAttackers: string; topPaths: string; last24h: string };
  settings: { title: string; enabled: string; rateLimit: string; autoBlock: string; save: string; saved: string; language: string; theme: string; dark: string; light: string };
  sim: { title: string; subtitle: string; method: string; path: string; body: string; run: string; presets: string; result: string; noRun: string; verdictBlocked: string; verdictAllowed: string; matched: string; noMatch: string };
  auth: { title: string; email: string; password: string; signIn: string; signUp: string; google: string; switchToSignUp: string; switchToSignIn: string; firstUserNote: string; signOut: string; notAdmin: string };
  docs: { title: string; sections: { t: string; d: string }[] };
  severities: { low: string; medium: string; high: string; critical: string };
  categories: { sqli: string; xss: string; path_traversal: string; command_injection: string; lfi: string; rfi: string; rate_limit: string; ip_block: string; other: string };
  common: { save: string; cancel: string; loading: string; error: string; search: string };
};


interface I18nCtx {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: Dict;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (localStorage.getItem("waf:lang") as Lang) || "en";
    setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("waf:lang", l);
  };

  const value: I18nCtx = {
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    setLang,
    t: dict[lang],
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}

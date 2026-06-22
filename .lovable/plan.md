
# مشروع تخرج: Web Application Firewall (WAF) Platform

منصة WAF كاملة بواجهة احترافية تناسب مشروع تخرج، تشمل: محرك فحص فعلي للطلبات، لوحة تحكم Real-time، إدارة قواعد الحماية، تحليلات بيانية، محاكي هجمات، ومصادقة Admin. الواجهة ثنائية اللغة (عربي/إنجليزي مع RTL).

## 1. الفكرة العامة (الـ Architecture)

```text
┌─────────────────┐        ┌──────────────────────────┐        ┌────────────────┐
│  Attack         │───────▶│   WAF Engine             │───────▶│  Protected     │
│  Simulator      │ HTTP   │  (Server Function)       │   ✓    │  Backend       │
│  (UI Tool)      │        │  - Rule matching         │        │  (Mock API)    │
└─────────────────┘        │  - SQLi / XSS / RCE      │        └────────────────┘
                           │  - Rate limiting         │
                           │  - IP blocking           │
                           └────────┬─────────────────┘
                                    │ logs every request
                                    ▼
                           ┌──────────────────────────┐
                           │  Lovable Cloud (DB)      │
                           │  - requests_log          │
                           │  - rules                 │
                           │  - blocked_ips           │
                           │  - admin user_roles      │
                           └────────┬─────────────────┘
                                    │
                                    ▼
                           ┌──────────────────────────┐
                           │  Admin Dashboard         │
                           │  - Real-time feed        │
                           │  - Charts & Analytics    │
                           │  - Rule management       │
                           │  - IP block list         │
                           └──────────────────────────┘
```

## 2. الصفحات (Routes)

**Public:**
- `/` — Landing page تشرح المشروع، الـ architecture، إحصائيات حية (عدد الهجمات المحظورة اليوم)، فريق المشروع.
- `/docs` — توثيق أكاديمي: المشكلة، الحل، طريقة العمل، النتائج، المراجع.
- `/simulator` — أداة محاكاة هجمات (يدخل المستخدم payload ويشوف هل الـ WAF بلوكه ولا لأ + شرح السبب).
- `/auth` — تسجيل دخول Admin.

**Admin (محمي تحت `_authenticated`):**
- `/dashboard` — Overview: KPIs + charts + last 10 attacks.
- `/dashboard/logs` — جدول كامل بكل الطلبات (filter حسب النوع/IP/الحالة/التاريخ) مع real-time updates.
- `/dashboard/rules` — CRUD للقواعد (regex pattern، النوع، الـ severity، enabled/disabled).
- `/dashboard/blocked-ips` — قائمة IPs المحظورة (إضافة/حذف يدوي + auto-block).
- `/dashboard/analytics` — Charts تفصيلية (هجمات حسب النوع، الزمن، الـ Top IPs، الـ Top targets).
- `/dashboard/settings` — تشغيل/إيقاف WAF، rate limit thresholds، تبديل اللغة.

## 3. الـ WAF Engine

Server function `inspectRequest({ method, path, headers, body, ip })` ترجع:
```ts
{ allowed: boolean, matchedRule?: Rule, reason?: string, severity: 'low'|'medium'|'high'|'critical' }
```

**فئات الكشف المدمجة (مع regex patterns جاهزة):**
- SQL Injection (UNION SELECT, OR 1=1, -- comments, …)
- XSS (`<script>`, `onerror=`, `javascript:`, …)
- Path Traversal (`../`, `..\`)
- Command Injection (`;`, `|`, `&&` + commands)
- LFI / RFI
- Rate limiting per IP (sliding window)
- IP blocklist check

كل طلب (مسموح أو محظور) يتسجل في `requests_log` ويُبث للـ Dashboard via Supabase Realtime.

## 4. الـ Database Schema (Lovable Cloud)

- `rules` — id, name, category, pattern (regex), severity, enabled, created_at
- `requests_log` — id, ip, method, path, payload, matched_rule_id, allowed, severity, created_at
- `blocked_ips` — id, ip, reason, blocked_until, created_at
- `waf_settings` — singleton row (enabled, rate_limit_per_min, auto_block_threshold)
- `user_roles` (admin/user) + `has_role()` security definer function
- Seed migration بيحط ~25 قاعدة افتراضية + admin role للمستخدم الأول

RLS:
- `rules`, `waf_settings`, `blocked_ips`: قراءة/كتابة Admin فقط
- `requests_log`: قراءة Admin فقط، الكتابة من الـ server function بـ `supabaseAdmin`
- بعض الإحصائيات العامة (count فقط) متاحة للـ Landing page عبر RPC آمنة

## 5. المصادقة

- Email/Password + Google OAuth (عبر Lovable broker)
- أول مستخدم يسجل = Admin تلقائياً (عبر migration trigger)
- الـ `_authenticated/route.tsx` المُدار من الـ integration + فحص role داخل كل dashboard route

## 6. الـ Real-time Dashboard

- Supabase Realtime subscription على `requests_log` → الجدول والـ counters يتحدثوا فوراً
- Toast notification عند هجوم critical
- KPI cards: Total Requests / Blocked / Top Attack Type / Active Rules

## 7. الـ Analytics

Recharts:
- Line chart: requests over time (مسموح vs محظور)
- Bar chart: attacks by category
- Pie chart: severity distribution
- Top 10 attacker IPs (جدول + bar)
- Top 10 targeted paths

## 8. الـ Attack Simulator (الجزء التفاعلي اللي بيبهر في المناقشة)

- Presets جاهزة (SQLi, XSS, Path Traversal, Command Injection)
- Custom payload input
- يعرض الـ request المُرسل، رد الـ WAF (allowed/blocked)، القاعدة اللي طبقت، والـ severity
- زرار "Try bypass" بـ payloads معقدة لاختبار الـ Engine

## 9. الـ Design System

- Dark cybersecurity theme (افتراضي) + Light mode toggle
- Primary: أخضر تيرمينال (#10b981) + Accent أحمر للتنبيهات (#ef4444)
- خط: JetBrains Mono للـ code/logs + Inter للنصوص + Cairo للعربي
- Animations خفيفة: pulsing dot للـ live indicator، fade-in للـ new log entries
- مكونات shadcn/ui الموجودة (Cards, Tables, Dialogs, Charts, Tabs)
- RTL كامل لما اللغة عربي، i18n عبر context بسيط (object-based translations)

## 10. الـ Tech Stack

- TanStack Start + React 19 + TypeScript
- Tailwind v4 + shadcn/ui + Recharts
- Lovable Cloud (Postgres + Auth + Realtime)
- WAF Engine: server functions نقية بدون dependencies خارجية

## 11. ملاحظات تقنية

- الـ Engine يشتغل كـ server function (مش reverse proxy حقيقي) — مناسب للـ demo الأكاديمي ويوضح نفس المبادئ
- كل القواعد regex-based عشان سهل شرحها في المناقشة
- الـ Simulator بيستدعي نفس الـ `inspectRequest` فعلياً — مش mock
- ممكن نضيف لاحقاً export PDF report للنتائج لو احتجت للتقرير المكتوب

## خطوات التنفيذ بالترتيب

1. تفعيل Lovable Cloud + migration للـ schema + seed rules
2. WAF Engine server function + types مشتركة
3. Auth (email + Google) + first-user-as-admin trigger
4. Layout (sidebar) + Dashboard overview
5. Logs page (realtime) + Rules CRUD + Blocked IPs
6. Analytics page (Recharts)
7. Attack Simulator
8. Landing + Docs pages
9. i18n (AR/EN toggle + RTL)
10. صقل التصميم النهائي + responsive

موافق أبدأ كده، ولا تحب نعدّل أي جزء (مثلاً نشيل الـ Simulator، أو نضيف export PDF للتقرير، أو نغير الـ theme)؟

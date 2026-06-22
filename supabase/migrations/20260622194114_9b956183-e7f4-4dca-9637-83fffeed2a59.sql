
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.attack_severity AS ENUM ('low','medium','high','critical');
CREATE TYPE public.attack_category AS ENUM ('sqli','xss','path_traversal','command_injection','lfi','rfi','rate_limit','ip_block','other');

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- First user becomes admin automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count int;
BEGIN
  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RULES ============
CREATE TABLE public.rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category attack_category NOT NULL,
  pattern text NOT NULL,
  severity attack_severity NOT NULL DEFAULT 'medium',
  enabled boolean NOT NULL DEFAULT true,
  is_builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rules TO authenticated;
GRANT ALL ON public.rules TO service_role;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rules" ON public.rules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ REQUESTS LOG ============
CREATE TABLE public.requests_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  payload text,
  user_agent text,
  matched_rule_id uuid REFERENCES public.rules(id) ON DELETE SET NULL,
  matched_rule_name text,
  category attack_category,
  severity attack_severity,
  allowed boolean NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.requests_log TO authenticated;
GRANT ALL ON public.requests_log TO service_role;
ALTER TABLE public.requests_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read logs" ON public.requests_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_requests_log_created ON public.requests_log(created_at DESC);
CREATE INDEX idx_requests_log_ip ON public.requests_log(ip);
CREATE INDEX idx_requests_log_allowed ON public.requests_log(allowed);

-- ============ BLOCKED IPS ============
CREATE TABLE public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL UNIQUE,
  reason text,
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_ips TO authenticated;
GRANT ALL ON public.blocked_ips TO service_role;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage blocked ips" ON public.blocked_ips FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ WAF SETTINGS ============
CREATE TABLE public.waf_settings (
  id int PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  rate_limit_per_min int NOT NULL DEFAULT 60,
  auto_block_threshold int NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO public.waf_settings(id) VALUES (1);
GRANT SELECT, UPDATE ON public.waf_settings TO authenticated;
GRANT ALL ON public.waf_settings TO service_role;
ALTER TABLE public.waf_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated reads settings" ON public.waf_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update settings" ON public.waf_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PUBLIC STATS (for landing page) ============
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(total_blocked bigint, total_requests bigint, active_rules bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.requests_log WHERE allowed = false),
    (SELECT count(*) FROM public.requests_log),
    (SELECT count(*) FROM public.rules WHERE enabled = true);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;

-- ============ SEED BUILT-IN RULES ============
INSERT INTO public.rules(name,description,category,pattern,severity,is_builtin) VALUES
('SQLi - UNION SELECT','Detects UNION-based SQL injection','sqli','(?i)union[\s\/\*]+select','high',true),
('SQLi - OR 1=1','Classic tautology-based SQL injection','sqli','(?i)(\bor\b|\band\b)\s+[''"]?\d+[''"]?\s*=\s*[''"]?\d+','high',true),
('SQLi - SQL Comment','SQL comment terminators used to bypass filters','sqli','(--|#|\/\*)','medium',true),
('SQLi - Stacked Queries','Multiple SQL statements separated by semicolon','sqli','(?i);\s*(drop|delete|insert|update|create|alter)\b','critical',true),
('SQLi - SELECT FROM','Suspicious SELECT statement in input','sqli','(?i)select\s+.+\s+from\s+','high',true),
('XSS - Script Tag','Script tag injection','xss','(?i)<\s*script[^>]*>','high',true),
('XSS - Event Handler','Inline event handlers (onerror, onload, onclick...)','xss','(?i)\bon(error|load|click|mouseover|focus|blur)\s*=','high',true),
('XSS - JavaScript URI','javascript: protocol in URL','xss','(?i)javascript\s*:','high',true),
('XSS - IMG onerror','Image tag with onerror handler','xss','(?i)<\s*img[^>]+onerror','critical',true),
('XSS - Iframe Injection','Iframe injection attempts','xss','(?i)<\s*iframe[^>]*>','high',true),
('Path Traversal - Unix','Directory traversal using ../','path_traversal','(\.\.\/){1,}','high',true),
('Path Traversal - Windows','Directory traversal using ..\\','path_traversal','(\.\.\\){1,}','high',true),
('Path Traversal - Encoded','URL-encoded path traversal','path_traversal','(?i)(%2e%2e[\/\\])','high',true),
('Path Traversal - etc/passwd','Direct access to /etc/passwd','path_traversal','(?i)\/etc\/passwd','critical',true),
('Command Injection - Pipe','Shell pipe operators','command_injection','(?i)[;&|`]\s*(ls|cat|whoami|id|uname|wget|curl|nc|bash|sh)\b','critical',true),
('Command Injection - Backtick','Backtick command substitution','command_injection','`[^`]+`','high',true),
('Command Injection - $()','Command substitution $(...)','command_injection','\$\([^)]+\)','high',true),
('LFI - PHP Wrapper','PHP filter/data wrappers','lfi','(?i)php:\/\/(filter|input|data)','critical',true),
('LFI - file://','file:// protocol','lfi','(?i)file:\/\/','high',true),
('RFI - Remote Include','Remote file inclusion via http(s)','rfi','(?i)(http|https|ftp):\/\/[^\s]+\.(php|asp|jsp|txt)','critical',true),
('XSS - SVG onload','SVG with onload handler','xss','(?i)<\s*svg[^>]+onload','high',true),
('SQLi - SLEEP/BENCHMARK','Time-based blind SQLi','sqli','(?i)(sleep|benchmark|waitfor)\s*\(','high',true),
('XSS - Data URI Script','data: URI with script','xss','(?i)data\s*:\s*text\/html','medium',true),
('Command Injection - Newline','Newline injection','command_injection','(\r\n|%0a|%0d)','medium',true),
('SQLi - INFORMATION_SCHEMA','Database metadata enumeration','sqli','(?i)information_schema','high',true);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_ips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rules;

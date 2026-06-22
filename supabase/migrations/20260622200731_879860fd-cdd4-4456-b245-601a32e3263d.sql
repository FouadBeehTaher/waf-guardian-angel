
ALTER TYPE public.attack_category ADD VALUE IF NOT EXISTS 'ssti';
ALTER TYPE public.attack_category ADD VALUE IF NOT EXISTS 'xxe';
ALTER TYPE public.attack_category ADD VALUE IF NOT EXISTS 'dom_xss';
ALTER TYPE public.attack_category ADD VALUE IF NOT EXISTS 'ssi';
ALTER TYPE public.attack_category ADD VALUE IF NOT EXISTS 'file_upload';
ALTER TYPE public.attack_category ADD VALUE IF NOT EXISTS 'file_inclusion';

ALTER TABLE public.rules
  ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 1.0;

ALTER TABLE public.requests_log
  ADD COLUMN IF NOT EXISTS threat_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matched_rules jsonb;

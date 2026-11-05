CREATE TABLE public.tenant_ai_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  api_key_ciphertext text NOT NULL,
  key_hint text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tenant_ai_settings TO service_role;
ALTER TABLE public.tenant_ai_settings ENABLE ROW LEVEL SECURITY;
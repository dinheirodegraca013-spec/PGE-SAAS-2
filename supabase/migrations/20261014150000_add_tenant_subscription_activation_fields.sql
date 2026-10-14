-- Campos reais de contratação/ativação e cadastro da empresa usados em Configurações.
-- A data é preenchida pelo RPC admin_ativar_plano_empresa no momento da ativação manual.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plano_solicitado_id text REFERENCES public.saas_planos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS data_contratacao timestamptz,
  ADD COLUMN IF NOT EXISTS inicio_utilizacao timestamptz;

COMMENT ON COLUMN public.tenants.plano_solicitado_id IS 'Plano pago solicitado no cadastro; não representa ativação nem pagamento confirmado.';
COMMENT ON COLUMN public.tenants.data_contratacao IS 'Data/hora em que o Super Admin ativou manualmente o plano contratado.';
COMMENT ON COLUMN public.tenants.inicio_utilizacao IS 'Data/hora em que o acesso ao plano foi liberado pelo Super Admin.';
COMMENT ON COLUMN public.tenants.logo_url IS 'URL real da logo da empresa armazenada no Supabase Storage.';

CREATE INDEX IF NOT EXISTS idx_tenants_plano_solicitado_id
  ON public.tenants(plano_solicitado_id)
  WHERE plano_solicitado_id IS NOT NULL;

-- Persistência dos dados comerciais complementares do tenant.
-- Valores ausentes continuam NULL; não migrar dados antigos do localStorage,
-- pois não há garantia de que correspondam a um cadastro confirmado.

CREATE TABLE IF NOT EXISTS public.tenant_dados_comerciais (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  cnpj text,
  ramo_atividade text,
  telefone_comercial text,
  email_comercial text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  telefone_responsavel text,
  cargo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_dados_comerciais_cnpj_check CHECK (cnpj IS NULL OR cnpj = '' OR cnpj ~ '^[0-9]{14}$'),
  CONSTRAINT tenant_dados_comerciais_cep_check CHECK (cep IS NULL OR cep = '' OR cep ~ '^[0-9]{8}$'),
  CONSTRAINT tenant_dados_comerciais_estado_check CHECK (estado IS NULL OR estado = '' OR estado ~ '^[A-Z]{2}$')
);

ALTER TABLE public.tenant_dados_comerciais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_dados_comerciais_select ON public.tenant_dados_comerciais;
CREATE POLICY tenant_dados_comerciais_select ON public.tenant_dados_comerciais
  FOR SELECT TO authenticated
  USING (tenant_id = private.current_tenant_id() OR private.is_saas_super_admin());

DROP POLICY IF EXISTS tenant_dados_comerciais_insert ON public.tenant_dados_comerciais;
CREATE POLICY tenant_dados_comerciais_insert ON public.tenant_dados_comerciais
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.current_tenant_id() AND private.current_user_role() = 'AdministradorTenant');

DROP POLICY IF EXISTS tenant_dados_comerciais_update ON public.tenant_dados_comerciais;
CREATE POLICY tenant_dados_comerciais_update ON public.tenant_dados_comerciais
  FOR UPDATE TO authenticated
  USING (tenant_id = private.current_tenant_id() AND private.current_user_role() = 'AdministradorTenant')
  WITH CHECK (tenant_id = private.current_tenant_id() AND private.current_user_role() = 'AdministradorTenant');

GRANT SELECT, INSERT, UPDATE ON public.tenant_dados_comerciais TO authenticated;

COMMENT ON TABLE public.tenant_dados_comerciais IS
  'Dados comerciais complementares informados pelo cliente, persistidos no banco e isolados por tenant.';

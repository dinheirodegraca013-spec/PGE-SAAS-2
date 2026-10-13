CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- =========================================================================
-- PGE SAAS 2 — MIGRAÇÃO: DASHBOARD ADMINISTRATIVO & FINANCEIRO DO SAAS
-- Versão: 20261013000000
-- =========================================================================

-- 1. TABELA DE USUÁRIOS E EQUIPE INTERNA DO SAAS
CREATE TABLE IF NOT EXISTS public.saas_usuarios_internos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT NOT NULL,
    papel TEXT NOT NULL CHECK (papel IN ('SuperAdmin', 'SaaSFinanceiro', 'SaaSConsulta')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    permissoes JSONB NOT NULL DEFAULT '{"acesso_admin": true, "acesso_financeiro": false, "leitura_apenas": false}'::jsonb,
    concedido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE PLANOS COMERCIALIZADOS DO SAAS
CREATE TABLE IF NOT EXISTS public.saas_planos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    periodicidade TEXT NOT NULL DEFAULT 'mensal' CHECK (periodicidade IN ('mensal', 'trimestral', 'semestral', 'anual')),
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    recursos JSONB NOT NULL DEFAULT '[]'::jsonb,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE LINKS EXTERNOS DE PAGAMENTO POR PLANO
CREATE TABLE IF NOT EXISTS public.saas_planos_links (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    plano_id TEXT NOT NULL REFERENCES public.saas_planos(id) ON DELETE CASCADE,
    provedor TEXT NOT NULL CHECK (provedor IN ('MercadoPago', 'InfinitePay', 'Manual', 'Outro')),
    url_checkout TEXT NOT NULL,
    periodicidade TEXT NOT NULL DEFAULT 'mensal',
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    id_externo TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DE ASSINATURAS DAS EMPRESAS (TENANTS)
CREATE TABLE IF NOT EXISTS public.saas_assinaturas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plano_id TEXT REFERENCES public.saas_planos(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'pendente', 'suspensa', 'cancelada', 'vencida')),
    valor NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    periodicidade TEXT NOT NULL DEFAULT 'mensal',
    data_inicio TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    data_proximo_vencimento TIMESTAMPTZ NOT NULL,
    cancelada_em TIMESTAMPTZ,
    motivo_cancelamento TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE COBRANÇAS / FATURAS EMITIDAS
CREATE TABLE IF NOT EXISTS public.saas_cobrancas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    assinatura_id TEXT REFERENCES public.saas_assinaturas(id) ON DELETE SET NULL,
    valor NUMERIC(12,2) NOT NULL,
    data_vencimento TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'vencida', 'cancelada')),
    link_pagamento_utilizado TEXT,
    provedor TEXT DEFAULT 'Manual',
    descricao TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABELA DE PAGAMENTOS RECEBIDOS E CONCILIAÇÕES MANUAIS
CREATE TABLE IF NOT EXISTS public.saas_pagamentos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    cobranca_id TEXT REFERENCES public.saas_cobrancas(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    assinatura_id TEXT REFERENCES public.saas_assinaturas(id) ON DELETE SET NULL,
    valor NUMERIC(12,2) NOT NULL,
    data_pagamento TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    forma_pagamento TEXT NOT NULL DEFAULT 'PIX' CHECK (forma_pagamento IN ('PIX', 'Boleto', 'Cartao', 'Transferencia', 'Dinheiro', 'Outro')),
    status TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'pendente', 'estornado', 'rejeitado')),
    comprovante_referencia TEXT,
    desconto_ajuste NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    conferido_manualmente BOOLEAN NOT NULL DEFAULT false,
    conferido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    conferido_em TIMESTAMPTZ,
    id_transacao_gateway TEXT,
    provedor TEXT DEFAULT 'Manual',
    payload_gateway JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABELA DE CONFIGURAÇÕES DE GATEWAYS DE PAGAMENTO
CREATE TABLE IF NOT EXISTS public.saas_gateway_configs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    provedor TEXT NOT NULL UNIQUE CHECK (provedor IN ('MercadoPago', 'InfinitePay')),
    ativo BOOLEAN NOT NULL DEFAULT false,
    modo_ambiente TEXT NOT NULL DEFAULT 'sandbox' CHECK (modo_ambiente IN ('sandbox', 'producao')),
    public_key TEXT,
    access_token_mascarado TEXT,
    webhook_secret_mascarado TEXT,
    webhook_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABELA DE AUDITORIA ADMINISTRATIVA E FINANCEIRA DO SAAS
CREATE TABLE IF NOT EXISTS public.saas_audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usuario_email TEXT,
    papel_operador TEXT,
    acao TEXT NOT NULL,
    modulo TEXT NOT NULL CHECK (modulo IN ('Administracao', 'Financeiro', 'Planos', 'Assinaturas', 'Seguranca', 'Gateways')),
    registro_id TEXT,
    detalhes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Bootstrap seguro: concede SuperAdmin somente à conta proprietária já cadastrada.
-- O papel fica separado de profiles, sem depender de um papel editável pelo cliente.
INSERT INTO public.saas_usuarios_internos (user_id, email, nome, papel, ativo, permissoes)
SELECT p.id, p.email, COALESCE(NULLIF(p.nome_completo, ''), split_part(p.email, '@', 1)),
       'SuperAdmin', true,
       '{"acesso_admin":true,"acesso_financeiro":true,"leitura_apenas":false}'::jsonb
FROM public.profiles p
WHERE lower(p.email) = lower('guicabanas13@gmail.com')
  AND p.ativo IS TRUE
ON CONFLICT (user_id) DO UPDATE
SET papel = 'SuperAdmin', ativo = true,
    permissoes = EXCLUDED.permissoes, updated_at = now();

-- =========================================================================
-- ÍNDICES DE PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_saas_usuarios_internos_user ON public.saas_usuarios_internos(user_id);
CREATE INDEX IF NOT EXISTS idx_saas_assinaturas_tenant ON public.saas_assinaturas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_assinaturas_status ON public.saas_assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_saas_cobrancas_tenant ON public.saas_cobrancas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_cobrancas_status ON public.saas_cobrancas(status);
CREATE INDEX IF NOT EXISTS idx_saas_pagamentos_tenant ON public.saas_pagamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_pagamentos_cobranca ON public.saas_pagamentos(cobranca_id);
CREATE INDEX IF NOT EXISTS idx_saas_audit_logs_modulo ON public.saas_audit_logs(modulo);

-- =========================================================================
-- FUNÇÕES DE SEGURANÇA E PAPEL INTERNO
-- =========================================================================

-- Retorna o papel interno de um usuário ou NULL
CREATE OR REPLACE FUNCTION private.get_saas_user_internal_role(v_uid UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- 1. Verifica tabela de equipe interna
    SELECT papel INTO v_role
    FROM public.saas_usuarios_internos
    WHERE user_id = v_uid AND ativo = true
    LIMIT 1;

    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Valida se é SuperAdmin
CREATE OR REPLACE FUNCTION private.is_saas_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (private.get_saas_user_internal_role(auth.uid()) = 'SuperAdmin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Valida se tem acesso financeiro
CREATE OR REPLACE FUNCTION private.is_saas_financeiro()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := private.get_saas_user_internal_role(auth.uid());
    RETURN (v_role IN ('SuperAdmin', 'SaaSFinanceiro'));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Valida se é qualquer usuário interno autorizado
CREATE OR REPLACE FUNCTION private.is_saas_interno()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (private.get_saas_user_internal_role(auth.uid()) IS NOT NULL);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- =========================================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================================
ALTER TABLE public.saas_usuarios_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_planos_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Políticas saas_usuarios_internos: apenas SuperAdmin gerencia; outros internos apenas leem seu próprio perfil
DROP POLICY IF EXISTS "saas_usuarios_internos_admin" ON public.saas_usuarios_internos;
CREATE POLICY "saas_usuarios_internos_admin" ON public.saas_usuarios_internos
    FOR ALL USING (private.is_saas_super_admin() OR user_id = auth.uid())
    WITH CHECK (private.is_saas_super_admin());

-- 2. Políticas saas_planos: leitura pública/autenticada para checkout; escrita restrita a SuperAdmin
DROP POLICY IF EXISTS "saas_planos_select" ON public.saas_planos;
CREATE POLICY "saas_planos_select_public" ON public.saas_planos
    FOR SELECT TO anon USING (status = 'ativo');
CREATE POLICY "saas_planos_select_authenticated" ON public.saas_planos
    FOR SELECT TO authenticated USING (status = 'ativo' OR private.is_saas_interno());

DROP POLICY IF EXISTS "saas_planos_modify" ON public.saas_planos;
CREATE POLICY "saas_planos_modify" ON public.saas_planos
    FOR ALL USING (private.is_saas_super_admin())
    WITH CHECK (private.is_saas_super_admin());

-- 3. Políticas saas_planos_links: leitura pública para links ativos; modificação por SuperAdmin/Financeiro
DROP POLICY IF EXISTS "saas_planos_links_select" ON public.saas_planos_links;
CREATE POLICY "saas_planos_links_select_public" ON public.saas_planos_links
    FOR SELECT TO anon USING (status = 'ativo');
CREATE POLICY "saas_planos_links_select_authenticated" ON public.saas_planos_links
    FOR SELECT TO authenticated USING (status = 'ativo' OR private.is_saas_financeiro());

DROP POLICY IF EXISTS "saas_planos_links_modify" ON public.saas_planos_links;
CREATE POLICY "saas_planos_links_modify" ON public.saas_planos_links
    FOR ALL USING (private.is_saas_financeiro())
    WITH CHECK (private.is_saas_financeiro());

-- 4. Políticas saas_assinaturas:
-- Internos (Financeiro/SuperAdmin) veem e gerenciam todas
-- Empresas clientes veem apenas a sua própria assinatura ativa
DROP POLICY IF EXISTS "saas_assinaturas_policy" ON public.saas_assinaturas;
CREATE POLICY "saas_assinaturas_policy" ON public.saas_assinaturas
    FOR SELECT USING (private.is_saas_interno() OR tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "saas_assinaturas_modify" ON public.saas_assinaturas;
CREATE POLICY "saas_assinaturas_modify" ON public.saas_assinaturas
    FOR ALL USING (private.is_saas_super_admin() OR private.is_saas_financeiro())
    WITH CHECK (private.is_saas_super_admin() OR private.is_saas_financeiro());

-- 5. Políticas saas_cobrancas:
-- Internos veem e gerenciam todas
-- Clientes veem apenas suas próprias cobranças
DROP POLICY IF EXISTS "saas_cobrancas_policy" ON public.saas_cobrancas;
CREATE POLICY "saas_cobrancas_policy" ON public.saas_cobrancas
    FOR SELECT USING (private.is_saas_financeiro() OR tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "saas_cobrancas_modify" ON public.saas_cobrancas;
CREATE POLICY "saas_cobrancas_modify" ON public.saas_cobrancas
    FOR ALL USING (private.is_saas_financeiro())
    WITH CHECK (private.is_saas_financeiro());

-- 6. Políticas saas_pagamentos: restrita estritamente a equipe financeira / SuperAdmin
DROP POLICY IF EXISTS "saas_pagamentos_policy" ON public.saas_pagamentos;
CREATE POLICY "saas_pagamentos_policy" ON public.saas_pagamentos
    FOR ALL USING (private.is_saas_financeiro())
    WITH CHECK (private.is_saas_financeiro());

-- 7. Políticas saas_gateway_configs: exclusivo SuperAdmin
DROP POLICY IF EXISTS "saas_gateway_configs_policy" ON public.saas_gateway_configs;
CREATE POLICY "saas_gateway_configs_policy" ON public.saas_gateway_configs
    FOR ALL USING (private.is_saas_super_admin())
    WITH CHECK (private.is_saas_super_admin());

-- 8. Políticas saas_audit_logs: internos podem ler; inserção aberta para registro seguro
DROP POLICY IF EXISTS "saas_audit_logs_select" ON public.saas_audit_logs;
CREATE POLICY "saas_audit_logs_select" ON public.saas_audit_logs
    FOR SELECT USING (private.is_saas_interno());

DROP POLICY IF EXISTS "saas_audit_logs_insert" ON public.saas_audit_logs;
CREATE POLICY "saas_audit_logs_insert" ON public.saas_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (private.is_saas_interno() AND usuario_id = auth.uid());

-- Permissões do Data API; o RLS continua sendo a barreira de acesso.
GRANT SELECT ON public.saas_planos, public.saas_planos_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.saas_usuarios_internos, public.saas_planos, public.saas_planos_links,
  public.saas_assinaturas, public.saas_cobrancas, public.saas_pagamentos,
  public.saas_gateway_configs, public.saas_audit_logs TO authenticated;

REVOKE ALL ON FUNCTION private.get_saas_user_internal_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_saas_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_saas_financeiro() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_saas_interno() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_saas_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_saas_financeiro() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_saas_interno() TO authenticated;

DROP POLICY IF EXISTS tenants_read_saas_internal ON public.tenants;
CREATE POLICY tenants_read_saas_internal ON public.tenants
    FOR SELECT TO authenticated USING (private.is_saas_interno());
DROP POLICY IF EXISTS tenants_update_saas_admin ON public.tenants;
CREATE POLICY tenants_update_saas_admin ON public.tenants
    FOR UPDATE TO authenticated USING (private.is_saas_super_admin())
    WITH CHECK (private.is_saas_super_admin());
DROP POLICY IF EXISTS profiles_read_saas_admin ON public.profiles;
CREATE POLICY profiles_read_saas_admin ON public.profiles
    FOR SELECT TO authenticated USING (private.is_saas_super_admin());

DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR (tenant_id = private.current_tenant_id() AND private.current_user_role() = 'AdministradorTenant'))
    WITH CHECK (
      (id = auth.uid() AND tenant_id = private.current_tenant_id() AND papel = private.current_user_role())
      OR (tenant_id = private.current_tenant_id() AND private.current_user_role() = 'AdministradorTenant')
    );
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (nome_completo, email, updated_at) ON public.profiles TO authenticated;

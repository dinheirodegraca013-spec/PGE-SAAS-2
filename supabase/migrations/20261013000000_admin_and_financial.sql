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
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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
CREATE OR REPLACE FUNCTION public.get_saas_user_internal_role(v_uid UUID)
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

    -- 2. Fallback: perfil com papel SuperAdmin
    SELECT papel INTO v_role
    FROM public.profiles
    WHERE id = v_uid AND papel = 'SuperAdmin'
    LIMIT 1;

    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Valida se é SuperAdmin
CREATE OR REPLACE FUNCTION public.is_saas_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_saas_user_internal_role(auth.uid()) = 'SuperAdmin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Valida se tem acesso financeiro
CREATE OR REPLACE FUNCTION public.is_saas_financeiro()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := public.get_saas_user_internal_role(auth.uid());
    RETURN (v_role IN ('SuperAdmin', 'SaaSFinanceiro'));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Valida se é qualquer usuário interno autorizado
CREATE OR REPLACE FUNCTION public.is_saas_interno()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_saas_user_internal_role(auth.uid()) IS NOT NULL);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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
    FOR ALL USING (public.is_saas_super_admin() OR user_id = auth.uid())
    WITH CHECK (public.is_saas_super_admin());

-- 2. Políticas saas_planos: leitura pública/autenticada para checkout; escrita restrita a SuperAdmin
DROP POLICY IF EXISTS "saas_planos_select" ON public.saas_planos;
CREATE POLICY "saas_planos_select" ON public.saas_planos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "saas_planos_modify" ON public.saas_planos;
CREATE POLICY "saas_planos_modify" ON public.saas_planos
    FOR ALL USING (public.is_saas_super_admin())
    WITH CHECK (public.is_saas_super_admin());

-- 3. Políticas saas_planos_links: leitura pública para links ativos; modificação por SuperAdmin/Financeiro
DROP POLICY IF EXISTS "saas_planos_links_select" ON public.saas_planos_links;
CREATE POLICY "saas_planos_links_select" ON public.saas_planos_links
    FOR SELECT USING (status = 'ativo' OR public.is_saas_financeiro());

DROP POLICY IF EXISTS "saas_planos_links_modify" ON public.saas_planos_links;
CREATE POLICY "saas_planos_links_modify" ON public.saas_planos_links
    FOR ALL USING (public.is_saas_financeiro())
    WITH CHECK (public.is_saas_financeiro());

-- 4. Políticas saas_assinaturas:
-- Internos (Financeiro/SuperAdmin) veem e gerenciam todas
-- Empresas clientes veem apenas a sua própria assinatura ativa
DROP POLICY IF EXISTS "saas_assinaturas_policy" ON public.saas_assinaturas;
CREATE POLICY "saas_assinaturas_policy" ON public.saas_assinaturas
    FOR SELECT USING (public.is_saas_interno() OR tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "saas_assinaturas_modify" ON public.saas_assinaturas;
CREATE POLICY "saas_assinaturas_modify" ON public.saas_assinaturas
    FOR ALL USING (public.is_saas_super_admin() OR public.is_saas_financeiro())
    WITH CHECK (public.is_saas_super_admin() OR public.is_saas_financeiro());

-- 5. Políticas saas_cobrancas:
-- Internos veem e gerenciam todas
-- Clientes veem apenas suas próprias cobranças
DROP POLICY IF EXISTS "saas_cobrancas_policy" ON public.saas_cobrancas;
CREATE POLICY "saas_cobrancas_policy" ON public.saas_cobrancas
    FOR SELECT USING (public.is_saas_financeiro() OR tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "saas_cobrancas_modify" ON public.saas_cobrancas;
CREATE POLICY "saas_cobrancas_modify" ON public.saas_cobrancas
    FOR ALL USING (public.is_saas_financeiro())
    WITH CHECK (public.is_saas_financeiro());

-- 6. Políticas saas_pagamentos: restrita estritamente a equipe financeira / SuperAdmin
DROP POLICY IF EXISTS "saas_pagamentos_policy" ON public.saas_pagamentos;
CREATE POLICY "saas_pagamentos_policy" ON public.saas_pagamentos
    FOR ALL USING (public.is_saas_financeiro())
    WITH CHECK (public.is_saas_financeiro());

-- 7. Políticas saas_gateway_configs: exclusivo SuperAdmin
DROP POLICY IF EXISTS "saas_gateway_configs_policy" ON public.saas_gateway_configs;
CREATE POLICY "saas_gateway_configs_policy" ON public.saas_gateway_configs
    FOR ALL USING (public.is_saas_super_admin())
    WITH CHECK (public.is_saas_super_admin());

-- 8. Políticas saas_audit_logs: internos podem ler; inserção aberta para registro seguro
DROP POLICY IF EXISTS "saas_audit_logs_select" ON public.saas_audit_logs;
CREATE POLICY "saas_audit_logs_select" ON public.saas_audit_logs
    FOR SELECT USING (public.is_saas_interno());

DROP POLICY IF EXISTS "saas_audit_logs_insert" ON public.saas_audit_logs;
CREATE POLICY "saas_audit_logs_insert" ON public.saas_audit_logs
    FOR INSERT WITH CHECK (true);

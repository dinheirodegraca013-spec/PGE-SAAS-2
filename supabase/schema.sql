-- =========================================================================
-- PGE SAAS 2 - Esquema de Banco de Dados e Políticas RLS (Supabase/PostgreSQL)
-- =========================================================================

-- 1. Criação das Tabelas Principais com Isolamento Multi-tenant (organization_id)

-- 1.1 Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    email TEXT,
    telefone_whatsapp TEXT,
    observacoes TEXT,
    origem TEXT NOT NULL DEFAULT 'Manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.2 Tabela de Projetos de Móveis Planejados
CREATE TABLE IF NOT EXISTS public.projetos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id TEXT NOT NULL,
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 0,
    data_medicao_agendada TIMESTAMPTZ,
    data_prevista_entrega TIMESTAMPTZ,
    valor_total_orcamento NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    observacoes TEXT,
    ambientes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.3 Tabela de Serviços e Atendimentos
CREATE TABLE IF NOT EXISTS public.servicos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id TEXT NOT NULL,
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome TEXT NOT NULL,
    titulo TEXT,
    escopo TEXT,
    status TEXT NOT NULL DEFAULT 'EmAndamento',
    origem TEXT NOT NULL DEFAULT 'Manual',
    usuario_responsavel_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.4 Tabela de Orçamentos Comerciais
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id TEXT NOT NULL,
    servico_id TEXT REFERENCES public.servicos(id) ON DELETE CASCADE,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    data_validade TIMESTAMPTZ,
    observacoes_gerais TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente',
    tem_pdf_assinado BOOLEAN NOT NULL DEFAULT false,
    assinado_por_nome TEXT,
    assinado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.5 Tabela de Conversas Pendentes do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_conversas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id TEXT NOT NULL,
    telefone_origem_e164 TEXT NOT NULL,
    ultima_mensagem_texto TEXT,
    primeira_mensagem_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ultima_mensagem_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    quantidade_mensagens INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Pendente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.6 Tabela de Configuração da API do WhatsApp Cloud
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id TEXT NOT NULL UNIQUE,
    phone_number_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    business_account_id TEXT,
    numero_origem TEXT,
    webhook_verify_token TEXT NOT NULL,
    configurado BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- 2. Índices de Desempenho e Isolamento
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_clientes_org ON public.clientes(organization_id);
CREATE INDEX IF NOT EXISTS idx_projetos_org ON public.projetos(organization_id);
CREATE INDEX IF NOT EXISTS idx_servicos_org ON public.servicos(organization_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_org ON public.orcamentos(organization_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_servico ON public.orcamentos(servico_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_org ON public.whatsapp_conversas(organization_id);

-- =========================================================================
-- 3. Row Level Security (RLS) - Isolamento por Organização (Tenant)
-- =========================================================================

-- Função auxiliar para obter o organization_id do usuário logado
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'organization_id',
        current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Ativação de RLS em todas as tabelas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Políticas para Clientes
DROP POLICY IF EXISTS "Clientes tenant isolation" ON public.clientes;
CREATE POLICY "Clientes tenant isolation" ON public.clientes
    FOR ALL
    USING (organization_id = public.current_organization_id())
    WITH CHECK (organization_id = public.current_organization_id());

-- Políticas para Projetos
DROP POLICY IF EXISTS "Projetos tenant isolation" ON public.projetos;
CREATE POLICY "Projetos tenant isolation" ON public.projetos
    FOR ALL
    USING (organization_id = public.current_organization_id())
    WITH CHECK (organization_id = public.current_organization_id());

-- Políticas para Serviços
DROP POLICY IF EXISTS "Servicos tenant isolation" ON public.servicos;
CREATE POLICY "Servicos tenant isolation" ON public.servicos
    FOR ALL
    USING (organization_id = public.current_organization_id())
    WITH CHECK (organization_id = public.current_organization_id());

-- Políticas para Orçamentos (Permite leitura e aceite público via link)
DROP POLICY IF EXISTS "Orcamentos tenant isolation" ON public.orcamentos;
CREATE POLICY "Orcamentos tenant isolation" ON public.orcamentos
    FOR ALL
    USING (
        organization_id = public.current_organization_id()
        OR auth.role() = 'anon' -- Permite visualização e assinatura pública do orçamento
    )
    WITH CHECK (
        organization_id = public.current_organization_id()
        OR auth.role() = 'anon'
    );

-- Políticas para WhatsApp Conversas
DROP POLICY IF EXISTS "WhatsApp Conversas tenant isolation" ON public.whatsapp_conversas;
CREATE POLICY "WhatsApp Conversas tenant isolation" ON public.whatsapp_conversas
    FOR ALL
    USING (organization_id = public.current_organization_id())
    WITH CHECK (organization_id = public.current_organization_id());

-- Políticas para WhatsApp Configuração
DROP POLICY IF EXISTS "WhatsApp Config tenant isolation" ON public.whatsapp_config;
CREATE POLICY "WhatsApp Config tenant isolation" ON public.whatsapp_config
    FOR ALL
    USING (organization_id = public.current_organization_id())
    WITH CHECK (organization_id = public.current_organization_id());

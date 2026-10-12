-- =========================================================================
-- PGE SAAS 2 — ESQUEMA COMPLETO DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- =========================================================================

-- 1. TABELA DE TENANTS (ORGANIZAÇÕES / MARCENARIAS)
CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    documento TEXT,
    plano TEXT NOT NULL DEFAULT 'Standard',
    status TEXT NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE PROFILES (PERFIS DE USUÁRIOS VINCULADOS AO AUTH.USERS)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    papel TEXT NOT NULL DEFAULT 'AdministradorTenant',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    documento TEXT,
    telefone TEXT,
    email TEXT,
    observacoes TEXT,
    origem TEXT NOT NULL DEFAULT 'Manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DE PROJETOS DE MARCENARIA (projetos_marcenaria)
CREATE TABLE IF NOT EXISTS public.projetos_marcenaria (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 0,
    data_medicao TIMESTAMPTZ,
    data_entrega TIMESTAMPTZ,
    valor_total_orcamento NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    observacoes TEXT,
    ambientes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE SERVIÇOS E ATENDIMENTOS
CREATE TABLE IF NOT EXISTS public.servicos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome TEXT NOT NULL,
    titulo TEXT,
    escopo TEXT,
    status TEXT NOT NULL DEFAULT 'EmAndamento',
    origem TEXT NOT NULL DEFAULT 'Manual',
    usuario_responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TABELA DE ORÇAMENTOS COMERCIAIS
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    servico_id TEXT REFERENCES public.servicos(id) ON DELETE CASCADE,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    data_validade TIMESTAMPTZ,
    observacoes_gerais TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente',
    public_token UUID NOT NULL DEFAULT gen_random_uuid(),
    tem_pdf_assinado BOOLEAN NOT NULL DEFAULT false,
    assinado_por_nome TEXT,
    assinado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABELA DE MENSAGENS E CONVERSAS WHATSAPP (whatsapp_mensagens)
CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    telefone TEXT NOT NULL,
    conteudo TEXT,
    direcao TEXT NOT NULL DEFAULT 'inbound',
    status TEXT NOT NULL DEFAULT 'Pendente',
    quantidade_mensagens INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABELA DE CONFIGURAÇÃO DO WHATSAPP CLOUD API
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    phone_number_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    business_account_id TEXT,
    numero_origem TEXT,
    webhook_verify_token TEXT NOT NULL,
    configurado BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. TABELA DE AUDIT LOGS (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT,
    usuario_id UUID,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acao TEXT NOT NULL,
    tabela TEXT NOT NULL,
    registro_id TEXT,
    detalhes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- ÍNDICES DE PERFORMANCE E ISOLAMENTO MULTI-TENANT
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON public.clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projetos_marcenaria_tenant ON public.projetos_marcenaria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_servicos_tenant ON public.servicos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_tenant ON public.orcamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_tenant ON public.whatsapp_mensagens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) — SEGURANÇA E ISOLAMENTO DEFINITIVO
-- =========================================================================

-- Função segura para obter o tenant_id do usuário autenticado no banco
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS TEXT AS $$
DECLARE
    v_tenant_id TEXT;
BEGIN
    SELECT p.tenant_id INTO v_tenant_id
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_active = true
    LIMIT 1;

    RETURN v_tenant_id; -- Sem perfil ativo, não há tenant autorizado.
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Ativar RLS nas tabelas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos_marcenaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas Profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (id = auth.uid() OR tenant_id = public.current_tenant_id());

-- Políticas Clientes
DROP POLICY IF EXISTS "clientes_isolation" ON public.clientes;
CREATE POLICY "clientes_isolation" ON public.clientes
    FOR ALL USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- Políticas Projetos Marcenaria
DROP POLICY IF EXISTS "projetos_marcenaria_isolation" ON public.projetos_marcenaria;
CREATE POLICY "projetos_marcenaria_isolation" ON public.projetos_marcenaria
    FOR ALL USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- Políticas Serviços
DROP POLICY IF EXISTS "servicos_isolation" ON public.servicos;
CREATE POLICY "servicos_isolation" ON public.servicos
    FOR ALL USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- Políticas Orçamentos (Permite leitura/aceite público do link do orçamento enviado pelo WhatsApp)
DROP POLICY IF EXISTS "orcamentos_isolation" ON public.orcamentos;
CREATE POLICY "orcamentos_isolation" ON public.orcamentos
    FOR ALL USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- Políticas WhatsApp Mensagens
DROP POLICY IF EXISTS "whatsapp_mensagens_isolation" ON public.whatsapp_mensagens;
CREATE POLICY "whatsapp_mensagens_isolation" ON public.whatsapp_mensagens
    FOR ALL USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- Políticas WhatsApp Config
DROP POLICY IF EXISTS "whatsapp_config_isolation" ON public.whatsapp_config;
CREATE POLICY "whatsapp_config_isolation" ON public.whatsapp_config
    FOR ALL USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- Políticas Audit Logs
DROP POLICY IF EXISTS "audit_logs_isolation" ON public.audit_logs;
CREATE POLICY "audit_logs_isolation" ON public.audit_logs
    FOR ALL USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());


-- Public quotes: access only through the random public_token, never through the internal ID.
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS public_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS orcamentos_public_token_key ON public.orcamentos(public_token);

CREATE OR REPLACE FUNCTION public.get_public_orcamento(p_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
  SELECT jsonb_build_object('id', o.id, 'servico_id', o.servico_id, 'itens', o.itens,
    'valor_total', o.valor_total, 'data_validade', o.data_validade,
    'observacoes_gerais', o.observacoes_gerais, 'status', o.status,
    'tem_pdf_assinado', o.tem_pdf_assinado, 'assinado_por_nome', o.assinado_por_nome,
    'assinado_em', o.assinado_em)
  FROM public.orcamentos o WHERE o.public_token = p_token
    AND (o.data_validade IS NULL OR o.data_validade >= now())
    AND lower(o.status) IN ('pendente','enviado','visualizado','assinado') LIMIT 1
$fn$;

CREATE OR REPLACE FUNCTION public.assinar_orcamento_publico(p_token uuid, p_nome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE v_orcamento public.orcamentos%rowtype;
BEGIN
  IF p_nome IS NULL OR length(trim(p_nome)) < 3 THEN RAISE EXCEPTION 'Informe o nome completo para registrar o aceite.'; END IF;
  UPDATE public.orcamentos o SET status='Assinado', tem_pdf_assinado=true,
    assinado_por_nome=left(trim(p_nome),160), assinado_em=now(), updated_at=now()
  WHERE o.public_token=p_token AND (o.data_validade IS NULL OR o.data_validade >= now())
    AND lower(o.status) IN ('pendente','enviado','visualizado') AND coalesce(o.tem_pdf_assinado,false)=false
  RETURNING o.* INTO v_orcamento;
  IF NOT FOUND THEN
    SELECT o.* INTO v_orcamento FROM public.orcamentos o WHERE o.public_token=p_token
      AND (o.data_validade IS NULL OR o.data_validade >= now()) AND lower(o.status)='assinado' LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado, expirado ou indisponível.'; END IF;
  ELSE
    IF v_orcamento.servico_id IS NOT NULL THEN
      UPDATE public.servicos SET status='Aprovado', updated_at=now()
      WHERE id=v_orcamento.servico_id AND tenant_id=v_orcamento.tenant_id;
    END IF;
    INSERT INTO public.audit_logs (tenant_id, usuario_id, acao, tabela, registro_id, detalhes)
    VALUES (v_orcamento.tenant_id, NULL, 'ASSINAR_PUBLICO', 'orcamentos', v_orcamento.id::text,
      jsonb_build_object('nome',left(trim(p_nome),160),'canal','link_publico'));
  END IF;
  RETURN jsonb_build_object('id',v_orcamento.id,'servico_id',v_orcamento.servico_id,
    'itens',v_orcamento.itens,'valor_total',v_orcamento.valor_total,'data_validade',v_orcamento.data_validade,
    'observacoes_gerais',v_orcamento.observacoes_gerais,'status',v_orcamento.status,
    'tem_pdf_assinado',v_orcamento.tem_pdf_assinado,'assinado_por_nome',v_orcamento.assinado_por_nome,
    'assinado_em',v_orcamento.assinado_em);
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_public_orcamento(uuid) FROM public, authenticated, anon;
REVOKE ALL ON FUNCTION public.assinar_orcamento_publico(uuid,text) FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_public_orcamento(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assinar_orcamento_publico(uuid,text) TO anon, authenticated;

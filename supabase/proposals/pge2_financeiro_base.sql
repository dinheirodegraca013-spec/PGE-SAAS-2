-- PGE II / GESTIO: proposta de estrutura financeira do tenant.
-- REVISAO OBRIGATORIA antes de aplicar: confirmar schema real, RLS e migrations existentes.
-- Nunca executar diretamente em producao sem backup e testes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.financeiro_lancamentos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 tipo text NOT NULL CHECK (tipo IN ('receita','despesa')),
 descricao text NOT NULL CHECK (length(trim(descricao)) > 0),
 valor numeric(14,2) NOT NULL CHECK (valor > 0),
 vencimento date NOT NULL,
 status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','quitado','cancelado')),
 projeto_id text REFERENCES public.projetos_marcenaria(id) ON DELETE SET NULL,
 criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS financeiro_lancamentos_id_tenant_idx ON public.financeiro_lancamentos(id,tenant_id);
CREATE TABLE IF NOT EXISTS public.financeiro_baixas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lancamento_id uuid NOT NULL REFERENCES public.financeiro_lancamentos(id) ON DELETE RESTRICT,
 tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 valor numeric(14,2) NOT NULL CHECK (valor > 0),
 data_pagamento date NOT NULL,
 metodo text,
 referencia text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT financeiro_baixas_tenant_fk FOREIGN KEY (lancamento_id, tenant_id)
 REFERENCES public.financeiro_lancamentos(id, tenant_id)
);
CREATE INDEX IF NOT EXISTS financeiro_lancamentos_tenant_venc_idx ON public.financeiro_lancamentos(tenant_id,vencimento);
CREATE INDEX IF NOT EXISTS financeiro_baixas_tenant_data_idx ON public.financeiro_baixas(tenant_id,data_pagamento);
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_baixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY financeiro_lancamentos_select ON public.financeiro_lancamentos FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.tenant_id=financeiro_lancamentos.tenant_id AND p.is_active));
CREATE POLICY financeiro_lancamentos_insert ON public.financeiro_lancamentos FOR INSERT TO authenticated
 WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.tenant_id=financeiro_lancamentos.tenant_id AND p.is_active));
CREATE POLICY financeiro_lancamentos_update ON public.financeiro_lancamentos FOR UPDATE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.tenant_id=financeiro_lancamentos.tenant_id AND p.is_active))
 WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.tenant_id=financeiro_lancamentos.tenant_id AND p.is_active));
CREATE POLICY financeiro_baixas_select ON public.financeiro_baixas FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.tenant_id=financeiro_baixas.tenant_id AND p.is_active));
CREATE POLICY financeiro_baixas_insert ON public.financeiro_baixas FOR INSERT TO authenticated
 WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.tenant_id=financeiro_baixas.tenant_id AND p.is_active));
COMMIT;

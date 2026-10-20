-- PGE II / GESTIO: proposta de estrutura financeira do tenant.
-- REVISAO OBRIGATORIA antes de aplicar: confirmar schema real, RLS e migrations existentes.
-- Nunca executar diretamente em producao sem backup e testes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.financeiro_lancamentos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 tipo text NOT NULL CHECK (tipo IN ('receita','despesa')),
 descricao text NOT NULL CHECK (length(trim(descricao)) > 0),
 valor numeric(14,2) NOT NULL CHECK (valor > 0),
 vencimento date NOT NULL,
 status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','quitado','cancelado')),
 projeto_id uuid REFERENCES public.projetos_marcenaria(id) ON DELETE SET NULL,
 criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- Defesa adicional: projeto e lancamento devem pertencer ao mesmo tenant.
-- FK simples de projeto nao verifica tenant_id.
CREATE OR REPLACE FUNCTION public.financeiro_verificar_tenant_projeto()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $financeiro$
BEGIN
 IF NEW.projeto_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.projetos_marcenaria p
  WHERE p.id = NEW.projeto_id AND p.tenant_id = NEW.tenant_id
 ) THEN
  RAISE EXCEPTION 'Projeto nao pertence a empresa do lancamento'
   USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END;
$financeiro$;
REVOKE ALL ON FUNCTION public.financeiro_verificar_tenant_projeto() FROM PUBLIC;
CREATE TRIGGER financeiro_lancamento_tenant_projeto_check
 BEFORE INSERT OR UPDATE OF projeto_id, tenant_id ON public.financeiro_lancamentos
 FOR EACH ROW EXECUTE FUNCTION public.financeiro_verificar_tenant_projeto();
CREATE UNIQUE INDEX IF NOT EXISTS financeiro_lancamentos_id_tenant_idx ON public.financeiro_lancamentos(id,tenant_id);
CREATE TABLE IF NOT EXISTS public.financeiro_baixas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lancamento_id uuid NOT NULL REFERENCES public.financeiro_lancamentos(id) ON DELETE RESTRICT,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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
-- Acesso somente leitura nesta etapa. Escritas exigem RPC transacional validada.
-- A politica usa o mesmo helper de tenant das tabelas existentes.
CREATE POLICY financeiro_lancamentos_select ON public.financeiro_lancamentos FOR SELECT TO authenticated
 USING (tenant_id = (SELECT private.current_tenant_id()));
CREATE POLICY financeiro_baixas_select ON public.financeiro_baixas FOR SELECT TO authenticated
 USING (tenant_id = (SELECT private.current_tenant_id()));
REVOKE ALL ON public.financeiro_lancamentos, public.financeiro_baixas FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.financeiro_lancamentos, public.financeiro_baixas FROM authenticated;
GRANT SELECT ON public.financeiro_lancamentos, public.financeiro_baixas TO authenticated;
COMMIT;

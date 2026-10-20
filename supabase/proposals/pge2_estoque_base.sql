-- GESTIO / PGE II - estoque: proposta para revisão e testes em staging.
-- Não executar em produção sem validar permissões e migrações existentes.
BEGIN;
CREATE TABLE public.estoque_itens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 codigo text,
 nome text NOT NULL CHECK (length(trim(nome)) > 0),
 unidade text NOT NULL DEFAULT 'un',
 estoque_minimo numeric(14,3) NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
 ativo boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT estoque_itens_id_tenant_uniq UNIQUE (id, tenant_id)
);
CREATE UNIQUE INDEX estoque_itens_codigo_tenant_uniq ON public.estoque_itens (tenant_id, lower(codigo)) WHERE codigo IS NOT NULL;
CREATE INDEX estoque_itens_tenant_nome_idx ON public.estoque_itens (tenant_id, nome);
CREATE TABLE public.estoque_movimentacoes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 item_id uuid NOT NULL,
 tipo text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste_entrada','ajuste_saida')),
 quantidade numeric(14,3) NOT NULL CHECK (quantidade > 0),
 motivo text NOT NULL CHECK (length(trim(motivo)) > 0),
 projeto_id uuid,
 criado_por uuid REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT estoque_mov_item_tenant_fk FOREIGN KEY (item_id,tenant_id) REFERENCES public.estoque_itens(id,tenant_id),
 CONSTRAINT estoque_mov_projeto_fk FOREIGN KEY (projeto_id) REFERENCES public.projetos_marcenaria(id)
);
CREATE INDEX estoque_mov_tenant_item_data_idx ON public.estoque_movimentacoes (tenant_id,item_id,created_at DESC);
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY estoque_itens_read ON public.estoque_itens FOR SELECT TO authenticated
 USING (tenant_id = (SELECT private.current_tenant_id()));
CREATE POLICY estoque_mov_read ON public.estoque_movimentacoes FOR SELECT TO authenticated
 USING (tenant_id = (SELECT private.current_tenant_id()));
-- PENDENTE: FK composta (projeto_id,tenant_id) para impedir vinculo entre empresas.\n-- Sem políticas de escrita: movimentações exigem RPC transacional,
-- validação de saldo, autorização de papel e vínculo projeto/tenant.
REVOKE ALL ON public.estoque_itens,public.estoque_movimentacoes FROM anon;
REVOKE INSERT,UPDATE,DELETE ON public.estoque_itens,public.estoque_movimentacoes FROM authenticated;
GRANT SELECT ON public.estoque_itens,public.estoque_movimentacoes TO authenticated;
COMMIT;

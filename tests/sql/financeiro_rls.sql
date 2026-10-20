\set ON_ERROR_STOP on
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;
CREATE TABLE public.tenants (id uuid PRIMARY KEY);
CREATE TABLE public.projetos_marcenaria (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id));
CREATE FUNCTION private.current_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('app.test_tenant_id', true),'')::uuid
$$;
GRANT USAGE ON SCHEMA public, private, auth TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_tenant_id(), auth.uid() TO authenticated;
INSERT INTO public.tenants VALUES
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002');
\ir ../../supabase/proposals/pge2_financeiro_base.sql
-- A segunda aplicação deve ser idempotente: políticas e gatilhos existentes
-- precisam ser tratados pela migração antes que este teste possa passar.
\ir ../../supabase/proposals/pge2_financeiro_base.sql
-- Synthetic fixtures inserted by privileged test setup only.
INSERT INTO public.financeiro_lancamentos (id,tenant_id,tipo,descricao,valor,vencimento,status)
VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','receita','A',100,'2026-01-01','parcial'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','despesa','B',200,'2026-01-01','parcial');
INSERT INTO public.financeiro_baixas (lancamento_id,tenant_id,valor,data_pagamento)
VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',40,'2026-01-02'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',70,'2026-01-02');
-- Integrity: reject a baixa linked to another tenant at the FK boundary.
DO $$
BEGIN
 BEGIN
  INSERT INTO public.financeiro_baixas(lancamento_id,tenant_id,valor,data_pagamento)
  VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',1,'2026-01-02');
  RAISE EXCEPTION 'Cross-tenant baixa accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
END $$;
-- Testa RLS e privilégios diretos no PostgreSQL descartável.
-- As RPCs transacionais de escrita são verificadas separadamente.
SET ROLE authenticated;
SET request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['estoque_itens','estoque_movimentacoes','financeiro_lancamentos','financeiro_baixas'] LOOP
  IF to_regclass('public.' || t) IS NOT NULL THEN
   IF has_table_privilege(current_user,'public.' || t,'INSERT')
      OR has_table_privilege(current_user,'public.' || t,'UPDATE')
      OR has_table_privilege(current_user,'public.' || t,'DELETE')
      OR has_table_privilege(current_user,'public.' || t,'TRUNCATE')
      OR has_table_privilege(current_user,'public.' || t,'TRIGGER')
      OR has_table_privilege(current_user,'public.' || t,'REFERENCES') THEN
    RAISE EXCEPTION 'Unexpected direct write/DDL privilege on %',t;
   END IF;
  END IF;
 END LOOP;
END $$;
SET app.test_tenant_id = '00000000-0000-0000-0000-000000000001';
DO $$
DECLARE r numeric; d numeric;
BEGIN
 IF (SELECT count(*) FROM public.financeiro_lancamentos) <> 1 THEN RAISE EXCEPTION 'RLS lancamentos tenant A'; END IF;
 IF (SELECT count(*) FROM public.financeiro_baixas) <> 1 THEN RAISE EXCEPTION 'RLS baixas tenant A'; END IF;
 SELECT receitas, despesas INTO r,d FROM public.financeiro_resumo_baixas();
 IF r IS DISTINCT FROM 40 OR d IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'RPC tenant A: %, %',r,d; END IF;
END $$;
SET app.test_tenant_id = '00000000-0000-0000-0000-000000000002';
DO $$
DECLARE r numeric; d numeric;
BEGIN
 IF (SELECT count(*) FROM public.financeiro_lancamentos) <> 1 THEN RAISE EXCEPTION 'RLS lancamentos tenant B'; END IF;
 IF (SELECT count(*) FROM public.financeiro_baixas) <> 1 THEN RAISE EXCEPTION 'RLS baixas tenant B'; END IF;
 SELECT receitas, despesas INTO r,d FROM public.financeiro_resumo_baixas();
 IF r IS DISTINCT FROM 0 OR d IS DISTINCT FROM 70 THEN RAISE EXCEPTION 'RPC tenant B: %, %',r,d; END IF;
END $$;
DO $$
BEGIN
 BEGIN
  INSERT INTO public.financeiro_baixas (lancamento_id,tenant_id,valor,data_pagamento)
  VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',1,'2026-01-02');
  RAISE EXCEPTION 'INSERT unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$
BEGIN
 BEGIN
  PERFORM * FROM public.financeiro_lancamentos;
  RAISE EXCEPTION 'anon SELECT unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
SELECT 'RLS finance test OK' AS result;

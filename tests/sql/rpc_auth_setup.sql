\set ON_ERROR_STOP on
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $a$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $a$;
CREATE TABLE public.tenants(id uuid PRIMARY KEY);
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),tenant_id uuid NOT NULL REFERENCES public.tenants(id),papel text NOT NULL,ativo boolean NOT NULL DEFAULT true);
CREATE TABLE public.projetos_marcenaria(id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES public.tenants(id));
CREATE FUNCTION private.current_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS $t$ SELECT tenant_id FROM public.profiles WHERE id=auth.uid() AND ativo=true $t$;
GRANT USAGE ON SCHEMA public,auth,private TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid(),private.current_tenant_id() TO authenticated;
INSERT INTO public.tenants VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
INSERT INTO auth.users VALUES ('20000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000002'),('20000000-0000-0000-0000-000000000003');
INSERT INTO public.profiles VALUES
('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','AdministradorTenant',true),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','AdministradorTenant',true),
('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Visitante',true);
\ir ../../supabase/proposals/pge2_estoque_base.sql
ALTER TABLE public.estoque_itens ADD COLUMN saldo numeric(14,3) NOT NULL DEFAULT 0 CHECK(saldo>=0);
\ir ../../supabase/proposals/pge2_financeiro_base.sql
\ir ../../supabase/proposals/pge2_restringir_privilegios_estoque_financeiro.sql
CREATE OR REPLACE FUNCTION public.estoque_cadastrar_item(p_nome text, p_codigo text DEFAULT NULL::text, p_unidade text DEFAULT 'un'::text, p_estoque_minimo numeric DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_tenant uuid; v_id uuid;
BEGIN
 v_tenant := private.current_tenant_id();
 IF auth.uid() IS NULL OR v_tenant IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.tenant_id=v_tenant AND p.ativo IS TRUE AND p.papel IN ('AdministradorTenant','Gerente','Estoque')) THEN
 RAISE EXCEPTION 'Sem permissao' USING ERRCODE='42501'; END IF;
 IF p_nome IS NULL OR length(trim(p_nome))=0 OR length(p_nome)>200 OR p_unidade IS NULL OR length(trim(p_unidade))=0 OR length(p_unidade)>20 OR p_estoque_minimo IS NULL OR p_estoque_minimo<0 OR p_estoque_minimo<>round(p_estoque_minimo,3) THEN
 RAISE EXCEPTION 'Dados invalidos' USING ERRCODE='22023'; END IF;
 INSERT INTO public.estoque_itens(tenant_id,nome,codigo,unidade,estoque_minimo)
 VALUES(v_tenant,trim(p_nome),nullif(trim(p_codigo),''),trim(p_unidade),p_estoque_minimo) RETURNING id INTO v_id;
 RETURN v_id;
END $function$
;
CREATE OR REPLACE FUNCTION public.estoque_registrar_movimento(p_item_id uuid, p_tipo text, p_quantidade numeric, p_motivo text, p_projeto_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_tenant uuid;
 v_papel text;
 v_ativo boolean;
 v_saldo numeric(14,3);
 v_mov_id uuid;
 v_delta numeric(14,3);
BEGIN
 v_tenant := private.current_tenant_id();
 IF auth.uid() IS NULL OR v_tenant IS NULL THEN
  RAISE EXCEPTION 'Sessão inválida' USING ERRCODE = '42501';
 END IF;
 SELECT p.papel, p.ativo INTO v_papel, v_ativo
 FROM public.profiles p WHERE p.id = auth.uid() AND p.tenant_id = v_tenant;
 IF NOT FOUND OR v_ativo IS DISTINCT FROM true OR v_papel NOT IN ('AdministradorTenant','Gerente','Estoque') THEN
  RAISE EXCEPTION 'Operação não autorizada' USING ERRCODE = '42501';
 END IF;
 IF p_tipo IS NULL OR p_tipo NOT IN ('entrada','saida','ajuste_entrada','ajuste_saida')
    OR p_quantidade IS NULL OR p_quantidade <= 0
    OR p_quantidade > 99999999999.999
    OR p_quantidade <> round(p_quantidade, 3)
    OR p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
  RAISE EXCEPTION 'Movimentação inválida' USING ERRCODE = '22023';
 END IF;
 IF p_projeto_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.projetos_marcenaria
  WHERE id = p_projeto_id AND tenant_id = v_tenant
 ) THEN
  RAISE EXCEPTION 'Projeto de outra empresa ou inexistente' USING ERRCODE = '23514';
 END IF;
 v_delta := CASE WHEN p_tipo IN ('entrada','ajuste_entrada') THEN p_quantidade ELSE -p_quantidade END;
 UPDATE public.estoque_itens SET saldo = saldo + v_delta
 WHERE id = p_item_id AND tenant_id = v_tenant AND ativo = true
   AND saldo + v_delta >= 0
 RETURNING saldo INTO v_saldo;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Item indisponível ou saldo insuficiente' USING ERRCODE = '23514';
 END IF;
 INSERT INTO public.estoque_movimentacoes
 (tenant_id,item_id,tipo,quantidade,motivo,projeto_id,criado_por)
 VALUES (v_tenant,p_item_id,p_tipo,p_quantidade,p_motivo,p_projeto_id,auth.uid())
 RETURNING id INTO v_mov_id;
 RETURN v_mov_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.financeiro_criar_lancamento(p_tipo text, p_descricao text, p_valor numeric, p_vencimento date, p_projeto_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_tenant uuid; v_id uuid;
BEGIN
 v_tenant:=private.current_tenant_id();
 IF auth.uid() IS NULL OR v_tenant IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.tenant_id=v_tenant AND p.ativo IS TRUE AND p.papel IN ('AdministradorTenant','Gerente','Financeiro')) THEN
 RAISE EXCEPTION 'Sem permissao' USING ERRCODE='42501'; END IF;
 IF p_tipo NOT IN ('receita','despesa') OR p_descricao IS NULL OR length(trim(p_descricao))=0 OR length(p_descricao)>500 OR p_valor IS NULL OR p_valor<=0 OR p_valor<>round(p_valor,2) OR p_vencimento IS NULL THEN
 RAISE EXCEPTION 'Lancamento invalido' USING ERRCODE='22023'; END IF;
 IF p_projeto_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.projetos_marcenaria WHERE id=p_projeto_id AND tenant_id=v_tenant) THEN
 RAISE EXCEPTION 'Projeto invalido' USING ERRCODE='23514'; END IF;
 INSERT INTO public.financeiro_lancamentos(tenant_id,tipo,descricao,valor,vencimento,projeto_id,criado_por)
 VALUES(v_tenant,p_tipo,trim(p_descricao),p_valor,p_vencimento,p_projeto_id,auth.uid()) RETURNING id INTO v_id;
 RETURN v_id;
END $function$
;
CREATE OR REPLACE FUNCTION public.financeiro_registrar_baixa(p_lancamento_id uuid, p_valor numeric, p_data_pagamento date, p_metodo text DEFAULT NULL::text, p_referencia text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_tenant uuid; v_lanc public.financeiro_lancamentos%ROWTYPE; v_pago numeric; v_id uuid; v_total numeric;
BEGIN
 v_tenant:=private.current_tenant_id();
 IF auth.uid() IS NULL OR v_tenant IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.tenant_id=v_tenant AND p.ativo IS TRUE AND p.papel IN ('AdministradorTenant','Gerente','Financeiro')) THEN
 RAISE EXCEPTION 'Sem permissao' USING ERRCODE='42501'; END IF;
 IF p_valor IS NULL OR p_valor<=0 OR p_valor<>round(p_valor,2) OR p_data_pagamento IS NULL THEN
 RAISE EXCEPTION 'Baixa invalida' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_lanc FROM public.financeiro_lancamentos WHERE id=p_lancamento_id AND tenant_id=v_tenant FOR UPDATE;
 IF NOT FOUND OR v_lanc.status IN ('cancelado','quitado') THEN RAISE EXCEPTION 'Lancamento indisponivel' USING ERRCODE='23514'; END IF;
 SELECT coalesce(sum(valor),0) INTO v_pago FROM public.financeiro_baixas WHERE lancamento_id=p_lancamento_id AND tenant_id=v_tenant;
 v_total:=v_pago+p_valor;
 IF v_total>v_lanc.valor THEN RAISE EXCEPTION 'Baixa acima do saldo' USING ERRCODE='23514'; END IF;
 INSERT INTO public.financeiro_baixas(lancamento_id,tenant_id,valor,data_pagamento,metodo,referencia)
 VALUES(p_lancamento_id,v_tenant,p_valor,p_data_pagamento,p_metodo,p_referencia) RETURNING id INTO v_id;
 UPDATE public.financeiro_lancamentos SET status=CASE WHEN v_total=v_lanc.valor THEN 'quitado' ELSE 'parcial' END,updated_at=now() WHERE id=p_lancamento_id AND tenant_id=v_tenant;
 RETURN v_id;
END $function$
;
REVOKE ALL ON FUNCTION public.estoque_cadastrar_item(text,text,text,numeric),public.estoque_registrar_movimento(uuid,text,numeric,text,uuid),public.financeiro_criar_lancamento(text,text,numeric,date,uuid),public.financeiro_registrar_baixa(uuid,numeric,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.estoque_cadastrar_item(text,text,text,numeric),public.estoque_registrar_movimento(uuid,text,numeric,text,uuid),public.financeiro_criar_lancamento(text,text,numeric,date,uuid),public.financeiro_registrar_baixa(uuid,numeric,date,text,text) TO authenticated;

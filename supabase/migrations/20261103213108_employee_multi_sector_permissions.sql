BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN cargo text CHECK (cargo IS NULL OR length(cargo)<=120),
  ADD COLUMN suspenso boolean NOT NULL DEFAULT false,
  ADD COLUMN acesso_versao integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT profiles_suspended_inactive CHECK (NOT suspenso OR NOT ativo),
  ADD CONSTRAINT profiles_tenant_user_key UNIQUE(tenant_id,id);

CREATE TABLE private.employee_sector_grants (
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  setor text NOT NULL CHECK(setor IN ('corte','montagem','acabamento','instalacao','estoque','financeiro')),
  concedido_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,setor),
  FOREIGN KEY(tenant_id,user_id) REFERENCES public.profiles(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE private.operational_permission_catalog (
  modulo text NOT NULL,operacao text NOT NULL,
  PRIMARY KEY(modulo,operacao)
);
INSERT INTO private.operational_permission_catalog
SELECT modulo,unnest(operacoes) FROM (VALUES
  ('painel',ARRAY['visualizar']),
  ('ordens',ARRAY['visualizar','criar','editar','excluir','iniciar','pausar','concluir','aprovar','reprovar','exportar','anexar']),
  ('tarefas',ARRAY['visualizar','criar','editar','excluir','iniciar','pausar','concluir','aprovar','reprovar','exportar','anexar']),
  ('agenda',ARRAY['visualizar','criar','editar','excluir']),
  ('documentos',ARRAY['visualizar','anexar','excluir','exportar']),
  ('notificacoes',ARRAY['visualizar','editar','criar']),
  ('atividades',ARRAY['visualizar','exportar']),
  ('ocorrencias',ARRAY['visualizar','criar','editar','aprovar','reprovar','anexar']),
  ('perfil',ARRAY['visualizar','editar']),
  ('clientes',ARRAY['visualizar','criar','editar','excluir','exportar','anexar']),
  ('orcamentos',ARRAY['visualizar','criar','editar','excluir','aprovar','reprovar','exportar','anexar']),
  ('pedidos',ARRAY['visualizar','criar','editar','excluir','aprovar','reprovar','exportar']),
  ('descontos',ARRAY['aprovar']),
  ('estoque',ARRAY['visualizar','criar','editar','excluir','aprovar','reprovar','exportar','registrar_entrada','registrar_saida','registrar_devolucao','registrar_ajuste','transferir','reservar','inventariar']),
  ('financeiro',ARRAY['visualizar','criar','editar','aprovar','reprovar','exportar','registrar_pagamento','registrar_recebimento','relatorios','ver_sensiveis']),
  ('relatorios',ARRAY['visualizar','exportar'])
) modules(modulo,operacoes);
CREATE TABLE private.employee_permissions (
  tenant_id uuid NOT NULL,user_id uuid NOT NULL,modulo text NOT NULL,operacao text NOT NULL,
  escopo text NOT NULL CHECK(escopo IN ('atribuidos','setor','empresa')),
  concedido_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,modulo,operacao),
  FOREIGN KEY(tenant_id,user_id) REFERENCES public.profiles(tenant_id,id) ON DELETE CASCADE,
  FOREIGN KEY(modulo,operacao) REFERENCES private.operational_permission_catalog(modulo,operacao)
);
ALTER TABLE private.employee_sector_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.operational_permission_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.employee_sector_grants,private.employee_permissions,private.operational_permission_catalog FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.operational_owner(p_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.tenants t ON t.id=p.tenant_id
    WHERE p.id=auth.uid() AND p.tenant_id=p_tenant AND t.principal_usuario_id=p.id AND p.ativo AND t.ativo AND p.setor IS NULL AND p.papel='AdministradorTenant');
$$;
CREATE FUNCTION private.employee_has_sector(p_user uuid,p_tenant uuid,p_setor text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_user AND p.tenant_id=p_tenant AND p.ativo
    AND (p.setor=p_setor OR EXISTS(SELECT 1 FROM private.employee_sector_grants g WHERE g.user_id=p.id AND g.tenant_id=p.tenant_id AND g.setor=p_setor)));
$$;
CREATE FUNCTION private.operational_permission(p_tenant uuid,p_modulo text,p_operacao text,p_setor text DEFAULT NULL,p_atribuido boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.device_session_allowed() AND EXISTS(SELECT 1 FROM private.operational_permission_catalog WHERE modulo=p_modulo AND operacao=p_operacao)
    AND (private.operational_owner(p_tenant) OR EXISTS(
      SELECT 1 FROM private.employee_permissions perm JOIN public.profiles perfil ON perfil.id=perm.user_id AND perfil.tenant_id=perm.tenant_id
      WHERE perm.user_id=auth.uid() AND perm.tenant_id=p_tenant AND perfil.ativo AND perm.modulo=p_modulo AND perm.operacao=p_operacao
        AND (p_setor IS NULL OR private.employee_has_sector(perfil.id,p_tenant,p_setor))
        AND CASE perm.escopo WHEN 'empresa' THEN true WHEN 'setor' THEN p_setor IS NOT NULL AND private.employee_has_sector(perfil.id,p_tenant,p_setor) ELSE coalesce(p_atribuido,false) END
    ));
$$;

-- Preserve already authorized employee access. New office employees do not receive
-- finance permissions merely from their sector; owners must grant them explicitly.
CREATE FUNCTION private.seed_operational_permissions(p_user uuid,p_legacy_finance boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.profiles%ROWTYPE; creator uuid;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id=p_user;
  IF p.setor IS NULL OR EXISTS(SELECT 1 FROM private.employee_permissions WHERE user_id=p.id) THEN RETURN; END IF;
  SELECT principal_usuario_id INTO creator FROM public.tenants WHERE id=p.tenant_id;
  IF creator IS NULL THEN RAISE EXCEPTION 'Conta principal não encontrada.'; END IF;
  INSERT INTO private.employee_permissions(tenant_id,user_id,modulo,operacao,escopo,concedido_por)
    SELECT p.tenant_id,p.id,c.modulo,c.operacao,CASE WHEN p_legacy_finance AND c.modulo='ordens' AND c.operacao='visualizar' THEN 'setor' ELSE 'atribuidos' END,creator
    FROM private.operational_permission_catalog c WHERE
      (c.modulo IN ('painel','agenda','notificacoes','atividades','perfil') AND c.operacao='visualizar')
      OR (c.modulo IN ('ordens','tarefas') AND c.operacao IN ('visualizar','editar','iniciar','pausar','concluir'))
      OR (c.modulo='documentos' AND c.operacao IN ('visualizar','anexar'))
      OR (c.modulo='ocorrencias' AND c.operacao IN ('visualizar','criar','anexar'))
      OR (c.modulo='notificacoes' AND c.operacao='editar');
  IF p.setor='estoque' THEN
    INSERT INTO private.employee_permissions(tenant_id,user_id,modulo,operacao,escopo,concedido_por)
      SELECT p.tenant_id,p.id,c.modulo,c.operacao,'setor',creator FROM private.operational_permission_catalog c WHERE c.modulo='estoque' AND (p_legacy_finance OR c.operacao='visualizar');
    IF p_legacy_finance THEN
      INSERT INTO private.employee_permissions(tenant_id,user_id,modulo,operacao,escopo,concedido_por)
        VALUES(p.tenant_id,p.id,'relatorios','visualizar','setor',creator);
    END IF;
  END IF;
  IF p.setor='financeiro' AND p_legacy_finance THEN
    INSERT INTO private.employee_permissions(tenant_id,user_id,modulo,operacao,escopo,concedido_por)
      SELECT p.tenant_id,p.id,c.modulo,c.operacao,'empresa',creator FROM private.operational_permission_catalog c
      WHERE c.modulo='financeiro' AND c.operacao IN ('visualizar','criar','registrar_pagamento','registrar_recebimento');
  END IF;
END $$;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT id FROM public.profiles WHERE setor IS NOT NULL LOOP
    PERFORM private.seed_operational_permissions(p.id,true);
  END LOOP;
END $$;
CREATE FUNCTION private.seed_new_employee_permissions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM private.seed_operational_permissions(NEW.id,false);
  RETURN NEW;
END $$;
CREATE TRIGGER seed_new_employee_permissions AFTER INSERT OR UPDATE OF setor ON public.profiles
FOR EACH ROW WHEN(NEW.setor IS NOT NULL) EXECUTE FUNCTION private.seed_new_employee_permissions();

CREATE FUNCTION private.protect_employee_operational_fields() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF (NEW.cargo,NEW.suspenso,NEW.acesso_versao) IS DISTINCT FROM (OLD.cargo,OLD.suspenso,OLD.acesso_versao)
    AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Os dados de acesso devem ser alterados pelo administrador.' USING ERRCODE='42501';
  END IF;
  IF NEW.acesso_versao=OLD.acesso_versao AND
    (NEW.nome_completo,NEW.email,NEW.papel,NEW.setor,NEW.ativo,NEW.cargo,NEW.suspenso,NEW.tenant_id)
      IS DISTINCT FROM (OLD.nome_completo,OLD.email,OLD.papel,OLD.setor,OLD.ativo,OLD.cargo,OLD.suspenso,OLD.tenant_id) THEN
    NEW.acesso_versao:=OLD.acesso_versao+1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_employee_operational_fields BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.protect_employee_operational_fields();

CREATE FUNCTION private.operational_employee_json(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('id',p.id,'nome',p.nome_completo,'email',p.email,'cargo',p.cargo,'setor',p.setor,
    'status',CASE WHEN p.suspenso THEN 'suspenso' WHEN NOT p.ativo THEN 'inativo' WHEN NOT private.user_within_plan(p.id) THEN 'suspenso_plano' ELSE 'ativo' END,
    'created_at',p.created_at,'versao',p.acesso_versao,
    'ultimo_acesso',(SELECT max(last_seen_at) FROM private.login_devices WHERE user_id=p.id),
    'setores_adicionais',coalesce((SELECT jsonb_agg(setor ORDER BY setor) FROM private.employee_sector_grants WHERE user_id=p.id),'[]'::jsonb),
    'permissoes',coalesce((SELECT jsonb_agg(jsonb_build_object('modulo',modulo,'operacao',operacao,'escopo',escopo) ORDER BY modulo,operacao) FROM private.employee_permissions WHERE user_id=p.id),'[]'::jsonb))
  FROM public.profiles p WHERE p.id=p_user;
$$;
CREATE FUNCTION public.funcionario_configuracao(p_usuario_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT tenant_id INTO company FROM public.profiles WHERE id=p_usuario_id;
  IF company IS NULL OR NOT private.operational_owner(company) THEN RAISE EXCEPTION 'Funcionário não disponível nesta empresa.' USING ERRCODE='42501'; END IF;
  RETURN private.operational_employee_json(p_usuario_id);
END $$;
CREATE FUNCTION public.meu_contexto_operacional() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; owner boolean; permissions jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT tenant_id INTO company FROM public.profiles WHERE id=auth.uid();
  owner:=private.operational_owner(company);
  IF owner THEN
    SELECT jsonb_agg(jsonb_build_object('modulo',modulo,'operacao',operacao,'escopo','empresa') ORDER BY modulo,operacao) INTO permissions FROM private.operational_permission_catalog;
  ELSE
    SELECT jsonb_agg(jsonb_build_object('modulo',modulo,'operacao',operacao,'escopo',escopo) ORDER BY modulo,operacao) INTO permissions FROM private.employee_permissions WHERE user_id=auth.uid() AND tenant_id=company;
  END IF;
  RETURN jsonb_build_object('empresa_id',company,'proprietario',owner,'funcionario',private.operational_employee_json(auth.uid()),
    'permissoes',coalesce(permissions,'[]'::jsonb),
    'catalogo_permissoes',CASE WHEN owner THEN (SELECT jsonb_agg(to_jsonb(c) ORDER BY modulo,operacao) FROM private.operational_permission_catalog c) ELSE NULL END);
END $$;
CREATE FUNCTION public.funcionario_configurar(p_usuario_id uuid,p_nome text,p_cargo text,p_setor text,p_setores_adicionais text[],p_status text,p_permissoes jsonb,p_versao integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; current_profile public.profiles%ROWTYPE; previous jsonb; oldrole text;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT p.tenant_id INTO company FROM public.profiles p WHERE p.id=auth.uid();
  IF NOT private.operational_owner(company) OR p_usuario_id=auth.uid() THEN RAISE EXCEPTION 'Somente o proprietário pode gerenciar funcionários desta empresa.' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.tenants WHERE id=company FOR UPDATE;
  SELECT * INTO current_profile FROM public.profiles WHERE id=p_usuario_id AND tenant_id=company FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Funcionário não disponível nesta empresa.' USING ERRCODE='42501'; END IF;
  IF current_profile.acesso_versao IS DISTINCT FROM p_versao THEN RAISE EXCEPTION 'O acesso foi alterado por outra operação. Atualize os dados antes de salvar.' USING ERRCODE='40001'; END IF;
  IF length(trim(coalesce(p_nome,''))) NOT BETWEEN 2 AND 120 OR length(coalesce(p_cargo,''))>120
    OR p_setor IS NULL OR p_setor NOT IN ('corte','montagem','acabamento','instalacao','estoque','financeiro')
    OR p_status IS NULL OR p_status NOT IN ('ativo','inativo','suspenso') THEN RAISE EXCEPTION 'Dados de funcionário inválidos.'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_setores_adicionais) s WHERE s IS NULL OR s=p_setor OR s NOT IN ('corte','montagem','acabamento','instalacao','estoque','financeiro'))
    OR (SELECT count(*) FROM unnest(p_setores_adicionais))<>(SELECT count(DISTINCT s) FROM unnest(p_setores_adicionais) s) THEN RAISE EXCEPTION 'Setores adicionais inválidos ou duplicados.'; END IF;
  IF jsonb_typeof(p_permissoes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_permissoes)>200 THEN RAISE EXCEPTION 'Permissões inválidas.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_permissoes) x WHERE jsonb_typeof(x)<>'object'
    OR coalesce(x->>'escopo','') NOT IN ('atribuidos','setor','empresa')
    OR NOT EXISTS(SELECT 1 FROM private.operational_permission_catalog c WHERE c.modulo=x->>'modulo' AND c.operacao=x->>'operacao'))
    OR (SELECT count(*) FROM jsonb_array_elements(p_permissoes))<>(SELECT count(DISTINCT (x->>'modulo',x->>'operacao')) FROM jsonb_array_elements(p_permissoes) x) THEN RAISE EXCEPTION 'Permissões desconhecidas ou duplicadas.'; END IF;
  previous:=private.operational_employee_json(p_usuario_id);
  oldrole:=current_setting('request.jwt.claim.role',true);
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  UPDATE public.profiles SET nome_completo=trim(p_nome),cargo=nullif(trim(p_cargo),''),setor=p_setor,
    papel=CASE p_setor WHEN 'estoque' THEN 'Estoque' WHEN 'financeiro' THEN 'Financeiro' ELSE 'Instalador' END,
    ativo=p_status='ativo',suspenso=p_status='suspenso',acesso_versao=acesso_versao+1 WHERE id=p_usuario_id AND tenant_id=company;
  DELETE FROM private.employee_sector_grants WHERE user_id=p_usuario_id AND tenant_id=company;
  INSERT INTO private.employee_sector_grants(tenant_id,user_id,setor,concedido_por)
    SELECT company,p_usuario_id,s,auth.uid() FROM unnest(p_setores_adicionais) s;
  DELETE FROM private.employee_permissions WHERE user_id=p_usuario_id AND tenant_id=company;
  INSERT INTO private.employee_permissions(tenant_id,user_id,modulo,operacao,escopo,concedido_por)
    SELECT company,p_usuario_id,x->>'modulo',x->>'operacao',x->>'escopo',auth.uid() FROM jsonb_array_elements(p_permissoes) x;
  PERFORM set_config('request.jwt.claim.role',coalesce(oldrole,''),true);
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(company,auth.uid(),'FUNCIONARIO_PERMISSOES_ALTERADAS','profiles',p_usuario_id::text,
      jsonb_build_object('antes',previous,'depois',private.operational_employee_json(p_usuario_id),'resultado','sucesso'));
  RETURN private.operational_employee_json(p_usuario_id);
END $$;

-- Keep the legacy editor compatible with explicitly suspended employees.
DO $$ DECLARE definition text; BEGIN
  SELECT pg_get_functiondef('public.gerenciar_funcionario(uuid,text,text,boolean)'::regprocedure) INTO definition;
  definition:=replace(definition,'setor=p_setor,ativo=p_ativo,','setor=p_setor,ativo=p_ativo,suspenso=false,');
  EXECUTE definition;
END $$;

-- Preserve the restricted projections of production workers. Existing financial
-- and stock screens may read their tables only with the corresponding grant.
CREATE OR REPLACE FUNCTION private.employee_table_access(p_table text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce((SELECT CASE
    WHEN NOT p.ativo THEN false
    WHEN private.operational_owner(p.tenant_id) THEN true
    WHEN p_table='profiles' THEN true
    WHEN p_table IN ('estoque_itens','estoque_movimentacoes') THEN
      private.operational_permission(p.tenant_id,'estoque','visualizar','estoque',false)
    WHEN p_table IN ('financeiro_lancamentos','financeiro_baixas','projetos_marcenaria') THEN
      EXISTS(SELECT 1 FROM private.employee_permissions ep WHERE ep.user_id=p.id AND ep.tenant_id=p.tenant_id AND ep.modulo='financeiro' AND ep.operacao='visualizar')
      AND private.employee_has_sector(p.id,p.tenant_id,'financeiro')
    ELSE false END FROM public.profiles p WHERE p.id=auth.uid()),false);
$$;
CREATE FUNCTION private.financial_record_access(p_tenant uuid,p_lancamento uuid,p_operacao text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce((SELECT private.operational_permission(p_tenant,'financeiro',p_operacao,'financeiro',l.criado_por=auth.uid())
    FROM public.financeiro_lancamentos l WHERE l.id=p_lancamento AND l.tenant_id=p_tenant),false);
$$;
CREATE FUNCTION private.financial_project_access(p_tenant uuid,p_projeto uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce((SELECT private.operational_permission(p_tenant,'financeiro','visualizar','financeiro',p.created_by=auth.uid())
    FROM public.projetos_marcenaria p WHERE p.id=p_projeto AND p.tenant_id=p_tenant),false);
$$;
DROP POLICY employee_own_profile ON public.profiles;
CREATE POLICY employee_own_profile ON public.profiles AS RESTRICTIVE FOR ALL TO authenticated
USING(private.operational_owner(tenant_id) OR id=auth.uid())
WITH CHECK(private.operational_owner(tenant_id) OR id=auth.uid());
CREATE POLICY employee_financial_scope ON public.financeiro_lancamentos AS RESTRICTIVE FOR SELECT TO authenticated
USING(private.financial_record_access(tenant_id,id,'visualizar'));
CREATE POLICY employee_financial_scope ON public.financeiro_baixas AS RESTRICTIVE FOR SELECT TO authenticated
USING(private.financial_record_access(tenant_id,lancamento_id,'visualizar'));
CREATE POLICY employee_financial_project_scope ON public.projetos_marcenaria AS RESTRICTIVE FOR SELECT TO authenticated
USING(private.operational_owner(tenant_id) OR private.financial_project_access(tenant_id,id));

CREATE OR REPLACE FUNCTION public.estoque_cadastrar_item(p_nome text,p_codigo text DEFAULT NULL,p_unidade text DEFAULT 'un',p_estoque_minimo numeric DEFAULT 0) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; item_id uuid;
BEGIN
  PERFORM private.require_authorized_session();
  company:=private.current_tenant_id();
  IF private.operational_permission(company,'estoque','criar','estoque',false) IS NOT TRUE THEN RAISE EXCEPTION 'Sem permissão para cadastrar materiais.' USING ERRCODE='42501'; END IF;
  IF p_nome IS NULL OR length(trim(p_nome))=0 OR length(p_nome)>200 OR p_unidade IS NULL OR length(trim(p_unidade))=0 OR length(p_unidade)>20 OR p_estoque_minimo IS NULL OR p_estoque_minimo::text IN ('NaN','Infinity','-Infinity') OR p_estoque_minimo<0 OR p_estoque_minimo<>round(p_estoque_minimo,3) THEN RAISE EXCEPTION 'Dados inválidos.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.estoque_itens(tenant_id,nome,codigo,unidade,estoque_minimo)
    VALUES(company,trim(p_nome),nullif(trim(p_codigo),''),trim(p_unidade),p_estoque_minimo) RETURNING id INTO item_id;
  RETURN item_id;
END $$;
CREATE OR REPLACE FUNCTION public.estoque_registrar_movimento(p_item_id uuid,p_tipo text,p_quantidade numeric,p_motivo text,p_projeto_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; balance numeric(14,3); movement_id uuid; delta numeric(14,3); operation text;
BEGIN
  PERFORM private.require_authorized_session();
  company:=private.current_tenant_id();
  operation:=CASE p_tipo WHEN 'entrada' THEN 'registrar_entrada' WHEN 'saida' THEN 'registrar_saida' ELSE 'registrar_ajuste' END;
  IF private.operational_permission(company,'estoque',operation,'estoque',false) IS NOT TRUE THEN RAISE EXCEPTION 'Movimentação não autorizada.' USING ERRCODE='42501'; END IF;
  IF p_tipo IS NULL OR p_tipo NOT IN ('entrada','saida','ajuste_entrada','ajuste_saida') OR p_quantidade IS NULL OR p_quantidade<=0 OR p_quantidade>99999999999.999 OR p_quantidade<>round(p_quantidade,3) OR p_motivo IS NULL OR length(trim(p_motivo))=0 THEN RAISE EXCEPTION 'Movimentação inválida.' USING ERRCODE='22023'; END IF;
  IF p_projeto_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.projetos_marcenaria WHERE id=p_projeto_id AND tenant_id=company) THEN RAISE EXCEPTION 'Projeto de outra empresa ou inexistente.' USING ERRCODE='23514'; END IF;
  delta:=CASE WHEN p_tipo IN ('entrada','ajuste_entrada') THEN p_quantidade ELSE -p_quantidade END;
  UPDATE public.estoque_itens SET saldo=saldo+delta WHERE id=p_item_id AND tenant_id=company AND ativo AND saldo+delta>=0 RETURNING saldo INTO balance;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível ou saldo insuficiente.' USING ERRCODE='23514'; END IF;
  INSERT INTO public.estoque_movimentacoes(tenant_id,item_id,tipo,quantidade,motivo,projeto_id,criado_por)
    VALUES(company,p_item_id,p_tipo,p_quantidade,p_motivo,p_projeto_id,auth.uid()) RETURNING id INTO movement_id;
  RETURN movement_id;
END $$;
CREATE OR REPLACE FUNCTION public.financeiro_criar_lancamento(p_tipo text,p_descricao text,p_valor numeric,p_vencimento date,p_projeto_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; entry_id uuid;
BEGIN
  PERFORM private.require_authorized_session();
  company:=private.current_tenant_id();
  IF private.operational_permission(company,'financeiro','criar','financeiro',true) IS NOT TRUE THEN RAISE EXCEPTION 'Sem permissão para criar lançamentos.' USING ERRCODE='42501'; END IF;
  IF p_tipo IS NULL OR p_tipo NOT IN ('receita','despesa') OR p_descricao IS NULL OR length(trim(p_descricao))=0 OR length(p_descricao)>500 OR p_valor IS NULL OR p_valor::text IN ('NaN','Infinity','-Infinity') OR p_valor<=0 OR p_valor<>round(p_valor,2) OR p_vencimento IS NULL THEN RAISE EXCEPTION 'Lançamento inválido.' USING ERRCODE='22023'; END IF;
  IF p_projeto_id IS NOT NULL AND private.financial_project_access(company,p_projeto_id) IS NOT TRUE THEN RAISE EXCEPTION 'Projeto não disponível para este usuário.' USING ERRCODE='42501'; END IF;
  INSERT INTO public.financeiro_lancamentos(tenant_id,tipo,descricao,valor,vencimento,projeto_id,criado_por)
    VALUES(company,p_tipo,trim(p_descricao),p_valor,p_vencimento,p_projeto_id,auth.uid()) RETURNING id INTO entry_id;
  RETURN entry_id;
END $$;
CREATE OR REPLACE FUNCTION public.financeiro_registrar_baixa(p_lancamento_id uuid,p_valor numeric,p_data_pagamento date,p_metodo text DEFAULT NULL,p_referencia text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; entry public.financeiro_lancamentos%ROWTYPE; paid numeric; payment_id uuid; total numeric; operation text;
BEGIN
  PERFORM private.require_authorized_session();
  company:=private.current_tenant_id();
  SELECT * INTO entry FROM public.financeiro_lancamentos WHERE id=p_lancamento_id AND tenant_id=company FOR UPDATE;
  operation:=CASE entry.tipo WHEN 'despesa' THEN 'registrar_pagamento' ELSE 'registrar_recebimento' END;
  IF NOT FOUND OR private.financial_record_access(company,p_lancamento_id,operation) IS NOT TRUE THEN RAISE EXCEPTION 'Lançamento não disponível ou operação não autorizada.' USING ERRCODE='42501'; END IF;
  IF p_valor IS NULL OR p_valor::text IN ('NaN','Infinity','-Infinity') OR p_valor<=0 OR p_valor<>round(p_valor,2) OR p_data_pagamento IS NULL THEN RAISE EXCEPTION 'Baixa inválida.' USING ERRCODE='22023'; END IF;
  IF entry.status IN ('cancelado','quitado') THEN RAISE EXCEPTION 'Lançamento indisponível.' USING ERRCODE='23514'; END IF;
  SELECT coalesce(sum(valor),0) INTO paid FROM public.financeiro_baixas WHERE lancamento_id=p_lancamento_id AND tenant_id=company;
  total:=paid+p_valor;
  IF total>entry.valor THEN RAISE EXCEPTION 'Baixa acima do saldo.' USING ERRCODE='23514'; END IF;
  INSERT INTO public.financeiro_baixas(lancamento_id,tenant_id,valor,data_pagamento,metodo,referencia)
    VALUES(p_lancamento_id,company,p_valor,p_data_pagamento,p_metodo,p_referencia) RETURNING id INTO payment_id;
  UPDATE public.financeiro_lancamentos SET status=CASE WHEN total=entry.valor THEN 'quitado' ELSE 'parcial' END,updated_at=now() WHERE id=p_lancamento_id AND tenant_id=company;
  RETURN payment_id;
END $$;
CREATE OR REPLACE FUNCTION public.meu_setor_projetos() RETURNS TABLE(id text,titulo text,prazo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT projeto.id::text,coalesce(projeto.titulo,projeto.nome),left(coalesce(to_jsonb(projeto)->>'data_prevista_entrega',to_jsonb(projeto)->>'data_entrega',to_jsonb(projeto)->>'prazo'),10)
  FROM public.profiles perfil JOIN public.tenants empresa ON empresa.id=perfil.tenant_id
  JOIN public.projetos_setores destino ON destino.tenant_id=perfil.tenant_id::text
  JOIN public.projetos_marcenaria projeto ON projeto.id::text=destino.projeto_id AND projeto.tenant_id=perfil.tenant_id
  WHERE perfil.id=auth.uid() AND perfil.ativo AND empresa.ativo
    AND private.operational_permission(perfil.tenant_id,'ordens','visualizar',destino.setor,false)
  ORDER BY destino.atualizado_em DESC;
$$;

REVOKE ALL ON FUNCTION private.operational_owner(uuid),private.employee_has_sector(uuid,uuid,text),private.operational_permission(uuid,text,text,text,boolean),private.seed_operational_permissions(uuid,boolean),private.seed_new_employee_permissions(),private.protect_employee_operational_fields(),private.operational_employee_json(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.financial_record_access(uuid,uuid,text),private.financial_project_access(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.operational_owner(uuid),private.financial_record_access(uuid,uuid,text),private.financial_project_access(uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.funcionario_configuracao(uuid),public.meu_contexto_operacional(),public.funcionario_configurar(uuid,text,text,text,text[],text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.funcionario_configuracao(uuid),public.meu_contexto_operacional(),public.funcionario_configurar(uuid,text,text,text,text[],text,jsonb,integer) TO authenticated;

COMMIT;

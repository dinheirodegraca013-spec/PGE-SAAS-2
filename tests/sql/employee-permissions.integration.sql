-- Run inside BEGIN/ROLLBACK after the employee-permissions migration.
DO $$ DECLARE
  owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid(); worker_a uuid:=gen_random_uuid(); worker_b uuid:=gen_random_uuid();
  company_a uuid; company_b uuid; owner_sid uuid:=gen_random_uuid(); worker_sid uuid:=gen_random_uuid();
  worker_device uuid:=gen_random_uuid(); allowed jsonb; result jsonb; denied boolean; v integer; entry_id uuid;
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
    (owner_a,'permissions-'||owner_a||'@example.test','{"nome_completo":"Owner A","razao_social":"Permissions fixture A"}'),
    (owner_b,'permissions-'||owner_b||'@example.test','{"nome_completo":"Owner B","razao_social":"Permissions fixture B"}');
  SELECT tenant_id INTO company_a FROM public.profiles WHERE id=owner_a;
  SELECT tenant_id INTO company_b FROM public.profiles WHERE id=owner_b;
  INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data) VALUES
    (worker_a,'permissions-'||worker_a||'@example.test','{"nome_completo":"Worker A"}',jsonb_build_object('gestio_employee',true,'gestio_criado_por',owner_a,'gestio_tenant_id',company_a,'gestio_setor','corte')),
    (worker_b,'permissions-'||worker_b||'@example.test','{"nome_completo":"Worker B"}',jsonb_build_object('gestio_employee',true,'gestio_criado_por',owner_b,'gestio_tenant_id',company_b,'gestio_setor','corte'));
  PERFORM set_config('request.jwt.claim.sub',owner_a::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated','session_id',owner_sid)::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Owner fixture browser');
  allowed:='[{"modulo":"ordens","operacao":"visualizar","escopo":"atribuidos"},{"modulo":"tarefas","operacao":"editar","escopo":"setor"},{"modulo":"clientes","operacao":"visualizar","escopo":"empresa"}]';
  result:=public.funcionario_configurar(worker_a,'Worker A','Operador de corte','corte',ARRAY['montagem'],'ativo',allowed,1);
  IF (result->>'versao')::int<>2 OR result->>'cargo'<>'Operador de corte' OR result->'setores_adicionais'<>'["montagem"]'::jsonb THEN RAISE EXCEPTION 'Employee configuration failed'; END IF;
  denied:=false;
  BEGIN PERFORM public.funcionario_configurar(worker_a,'Stale update',null,'corte',ARRAY[]::text[],'ativo',allowed,1); EXCEPTION WHEN serialization_failure THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Stale permission edit overwrote a newer version'; END IF;
  denied:=false;
  BEGIN PERFORM public.funcionario_configuracao(worker_b); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Configuration leaked across tenants'; END IF;
  denied:=false;
  BEGIN PERFORM public.funcionario_configurar(worker_b,'Cross tenant',null,'corte',ARRAY[]::text[],'ativo',allowed,1); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Employee modified across tenants'; END IF;
  denied:=false;
  BEGIN PERFORM public.funcionario_configurar(worker_a,'Invalid sectors',null,'corte',ARRAY['montagem','montagem'],'ativo',allowed,2); EXCEPTION WHEN SQLSTATE 'P0001' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Duplicate sectors were accepted'; END IF;
  denied:=false;
  BEGIN PERFORM public.funcionario_configurar(worker_a,'Invalid permission',null,'corte',ARRAY[]::text[],'ativo','[{"modulo":"unknown","operacao":"visualizar","escopo":"empresa"}]',2); EXCEPTION WHEN SQLSTATE 'P0001' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Unknown permission was accepted'; END IF;
  PERFORM set_config('request.jwt.claim.sub',worker_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker_a,'role','authenticated','session_id',worker_sid)::text,true);
  PERFORM public.autorizar_dispositivo(worker_device,'Worker fixture browser');
  IF NOT private.operational_permission(company_a,'ordens','visualizar','corte',true) THEN RAISE EXCEPTION 'Assigned record denied'; END IF;
  IF private.operational_permission(company_a,'ordens','visualizar','corte',false) THEN RAISE EXCEPTION 'Unassigned record allowed'; END IF;
  IF NOT private.operational_permission(company_a,'tarefas','editar','montagem',false) THEN RAISE EXCEPTION 'Additional sector denied'; END IF;
  IF private.operational_permission(company_a,'ordens','visualizar','instalacao',true) THEN RAISE EXCEPTION 'Unauthorized sector allowed'; END IF;
  IF private.operational_permission(company_b,'ordens','visualizar','corte',true) THEN RAISE EXCEPTION 'Cross-tenant record allowed'; END IF;
  IF private.operational_permission(company_a,'financeiro','visualizar',null,true) THEN RAISE EXCEPTION 'Administrative client access granted finance'; END IF;
  denied:=false;
  BEGIN PERFORM public.funcionario_configurar(worker_a,'Self escalation',null,'financeiro',ARRAY[]::text[],'ativo',allowed,2); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Self-escalation allowed'; END IF;
  denied:=false;
  BEGIN UPDATE public.profiles SET cargo='Self promoted' WHERE id=worker_a; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Direct protected field update allowed'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated','session_id',owner_sid)::text,true);
  result:=public.funcionario_configurar(worker_a,'Worker A','Operador','corte',ARRAY[]::text[],'ativo',allowed,2);
  PERFORM set_config('request.jwt.claim.sub',worker_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker_a,'role','authenticated','session_id',worker_sid)::text,true);
  IF private.operational_permission(company_a,'tarefas','editar','montagem',false) THEN RAISE EXCEPTION 'Removed sector remains authorized'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated','session_id',owner_sid)::text,true);
  result:=public.funcionario_configurar(worker_a,'Worker A','Operador','corte',ARRAY[]::text[],'suspenso',allowed,3);
  IF result->>'status'<>'suspenso' OR private.user_within_plan(worker_a) THEN RAISE EXCEPTION 'Suspension did not block access'; END IF;
  IF EXISTS(SELECT 1 FROM private.login_devices WHERE user_id=worker_a AND revoked_at IS NULL) THEN RAISE EXCEPTION 'Suspension did not revoke devices'; END IF;
  -- The existing administrator editor must remain usable and advance the version.
  PERFORM public.gerenciar_funcionario(worker_a,'Worker A','corte',true);
  SELECT acesso_versao INTO v FROM public.profiles WHERE id=worker_a;
  IF v<>5 OR (SELECT suspenso FROM public.profiles WHERE id=worker_a) THEN RAISE EXCEPTION 'Legacy editor compatibility failed'; END IF;
  -- Office access is distinct from financial reading and payment authorization.
  entry_id:=public.financeiro_criar_lancamento('despesa','Fixture expense',100,current_date,NULL);
  result:=public.funcionario_configurar(worker_a,'Worker A','Assistente','financeiro',ARRAY[]::text[],'ativo',
    '[{"modulo":"clientes","operacao":"visualizar","escopo":"empresa"}]',v);
  v:=(result->>'versao')::int;
  PERFORM set_config('request.jwt.claim.sub',worker_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker_a,'role','authenticated','session_id',worker_sid)::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Reactivated worker browser');
  denied:=false;
  BEGIN PERFORM public.financeiro_criar_lancamento('despesa','Unauthorized expense',20,current_date,NULL); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Office sector implicitly granted financial creation'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF EXISTS(SELECT 1 FROM public.financeiro_lancamentos WHERE id=entry_id) THEN RAISE EXCEPTION 'Office role bypassed financial RLS'; END IF;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub',owner_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated','session_id',owner_sid)::text,true);
  result:=public.funcionario_configurar(worker_a,'Worker A','Assistente','financeiro',ARRAY[]::text[],'ativo',
    '[{"modulo":"financeiro","operacao":"visualizar","escopo":"atribuidos"}]',v);
  v:=(result->>'versao')::int;
  PERFORM set_config('request.jwt.claim.sub',worker_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker_a,'role','authenticated','session_id',worker_sid)::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF EXISTS(SELECT 1 FROM public.financeiro_lancamentos WHERE id=entry_id) THEN RAISE EXCEPTION 'Assigned financial scope leaked another creator record'; END IF;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub',owner_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated','session_id',owner_sid)::text,true);
  result:=public.funcionario_configurar(worker_a,'Worker A','Assistente','financeiro',ARRAY[]::text[],'ativo',
    '[{"modulo":"financeiro","operacao":"visualizar","escopo":"empresa"}]',v);
  v:=(result->>'versao')::int;
  PERFORM set_config('request.jwt.claim.sub',worker_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker_a,'role','authenticated','session_id',worker_sid)::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF NOT EXISTS(SELECT 1 FROM public.financeiro_lancamentos WHERE id=entry_id) THEN RAISE EXCEPTION 'Explicit financial reading was denied'; END IF;
  EXECUTE 'RESET ROLE';
  denied:=false;
  BEGIN PERFORM public.financeiro_registrar_baixa(entry_id,10,current_date,NULL,NULL); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Reading permission granted payment authorization'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated','session_id',owner_sid)::text,true);
  result:=public.funcionario_configurar(worker_a,'Worker A','Assistente','financeiro',ARRAY[]::text[],'ativo',
    '[{"modulo":"financeiro","operacao":"visualizar","escopo":"empresa"},{"modulo":"financeiro","operacao":"registrar_pagamento","escopo":"empresa"}]',v);
  PERFORM set_config('request.jwt.claim.sub',worker_a::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker_a,'role','authenticated','session_id',worker_sid)::text,true);
  PERFORM public.financeiro_registrar_baixa(entry_id,10,current_date,NULL,NULL);
  IF (SELECT sum(valor) FROM public.financeiro_baixas WHERE lancamento_id=entry_id)<>10 THEN RAISE EXCEPTION 'Explicit payment grant failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE tenant_id=company_a AND registro_id=worker_a::text AND acao='FUNCIONARIO_PERMISSOES_ALTERADAS') THEN RAISE EXCEPTION 'Permission audit missing'; END IF;
  IF has_table_privilege('authenticated','private.employee_permissions','SELECT') OR has_table_privilege('authenticated','private.employee_sector_grants','INSERT') THEN RAISE EXCEPTION 'Private permission storage exposed'; END IF;
END $$;
SELECT 'PASS: tenant isolation, scopes, additional sectors, finance separation, self-escalation, stale edits, suspension and audit' AS result;

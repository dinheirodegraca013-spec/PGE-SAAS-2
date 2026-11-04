DO $$
DECLARE fields jsonb:='[
 {"key":"quantidade","type":"integer","required":true},
 {"key":"validade","type":"date"},
 {"key":"saldo","type":"number","readOnly":true},
 {"key":"custo","type":"number","privacy":"estrategico"},
 {"key":"pecas","type":"table","unique_key":"codigo","columns":[{"key":"codigo","type":"text","required":true}]}
]'; bad jsonb;
BEGIN
  PERFORM private.validate_technical_fields(fields,'{"quantidade":2,"validade":"2028-02-29","pecas":[{"codigo":"P1"}]}',ARRAY[]::text[],true);
  PERFORM private.validate_technical_fields(fields,'{"custo":2}',ARRAY['estrategico']);
  FOREACH bad IN ARRAY ARRAY[
    '{"quantidade":1.5}'::jsonb,'{"quantidade":-1}'::jsonb,
    '{"quantidade":"2"}'::jsonb,'{"validade":"2026-02-30"}'::jsonb,
    '{"inventado":true}'::jsonb,'{"pecas":[{"codigo":" P1 "},{"codigo":"p1"}]}'::jsonb,
    '{"pecas":[{}]}'::jsonb
  ] LOOP
    BEGIN
      PERFORM private.validate_technical_fields(fields,bad);
      RAISE EXCEPTION 'Entrada inválida aceita: %',bad;
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
  END LOOP;
  FOREACH bad IN ARRAY ARRAY['{"saldo":2}'::jsonb,'{"custo":2}'::jsonb] LOOP
    BEGIN
      PERFORM private.validate_technical_fields(fields,bad);
      RAISE EXCEPTION 'Campo protegido aceito: %',bad;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  IF has_function_privilege('authenticated','private.validate_technical_fields(jsonb,jsonb,text[],boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Validador privado exposto';
  END IF;
END;
$$;
DO $$
DECLARE owner_id uuid:=gen_random_uuid(); company_id uuid; service_id uuid:=gen_random_uuid(); result jsonb;
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(owner_id,'sheet-'||owner_id||'@example.test','{"nome_completo":"Sheet fixture","razao_social":"Sheet fixture company"}');
  SELECT tenant_id INTO company_id FROM public.profiles WHERE id=owner_id;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',gen_random_uuid())::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Sheet test device');
  INSERT INTO public.servicos(id,tenant_id,nome,created_by) VALUES(service_id,company_id,'Sheet test service',owner_id);
  result:=public.ficha_servico_salvar(service_id,'corte','{"maquina":"Serra 1"}',0);
  IF result->>'versao'<>'1' THEN RAISE EXCEPTION 'Ficha não criada'; END IF;
  result:=public.ficha_servico_consultar(service_id,'corte');
  IF result->'dados'->>'maquina'<>'Serra 1' THEN RAISE EXCEPTION 'Ficha não carregada'; END IF;
  BEGIN
    PERFORM public.ficha_servico_salvar(service_id,'corte','{"maquina":"Stale"}',0);
    RAISE EXCEPTION 'Conflito de versão não bloqueado';
  EXCEPTION WHEN serialization_failure THEN NULL;
  END;
  PERFORM public.ficha_servico_salvar(service_id,'corte','{"observacoes":"Conferido"}',1);
  result:=public.ficha_servico_consultar(service_id,'corte');
  IF result->>'versao'<>'2' OR result->'dados'->>'maquina'<>'Serra 1' THEN RAISE EXCEPTION 'Patch perdeu campos anteriores'; END IF;
  IF (SELECT count(*) FROM public.audit_logs WHERE actor_id=owner_id AND acao='ficha_tecnica_salva')<>2 THEN RAISE EXCEPTION 'Auditoria incompleta'; END IF;
  result:=public.ficha_checklist_salvar(service_id,'corte','{"material_conferido":true}',2);
  IF result->>'versao'<>'3' OR result->'checklist'->>'material_conferido'<>'true' THEN RAISE EXCEPTION 'Checklist não salvo'; END IF;
  BEGIN
    PERFORM public.ficha_checklist_salvar(service_id,'corte','{"material_conferido":"sim"}',3);
    RAISE EXCEPTION 'Checklist aceitou valor não booleano';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.ficha_checklist_salvar(service_id,'corte','{"inventado":true}',3);
    RAISE EXCEPTION 'Checklist aceitou item inventado';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM public.ficha_servico_salvar(service_id,'instalacao','{}',0);
  BEGIN
    PERFORM public.ficha_checklist_salvar(service_id,'instalacao','{"aceite_cliente":true}',1);
    RAISE EXCEPTION 'Aceite de cliente marcado sem evidência';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  result:=public.ficha_servico_consultar(service_id,'corte');
  IF result->'checklist'->>'material_conferido'<>'true' THEN RAISE EXCEPTION 'Checklist não retornado'; END IF;
END;
$$;
DO $$
DECLARE owner_id uuid:=gen_random_uuid(); worker_id uuid:=gen_random_uuid(); outsider_id uuid:=gen_random_uuid();
  company_id uuid; service_id uuid:=gen_random_uuid(); other_service uuid:=gen_random_uuid(); result jsonb;
  worker_session uuid:=gen_random_uuid(); owner_session uuid:=gen_random_uuid();
BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
    (owner_id,'sheet-owner-'||owner_id||'@example.test','{"nome_completo":"Sheet owner","razao_social":"Sheet ACL fixture"}'),
    (outsider_id,'sheet-other-'||outsider_id||'@example.test','{"nome_completo":"Other company","razao_social":"Other sheet fixture"}');
  SELECT tenant_id INTO company_id FROM public.profiles WHERE id=owner_id;
  INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data) VALUES
    (worker_id,'sheet-worker-'||worker_id||'@example.test','{"nome_completo":"Sheet worker"}',
      jsonb_build_object('gestio_employee',true,'gestio_criado_por',owner_id,'gestio_tenant_id',company_id,'gestio_setor','estoque'));
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',owner_session)::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Sheet owner test');
  PERFORM public.funcionario_configurar(worker_id,'Sheet worker','Estoquista','estoque',ARRAY[]::text[],'ativo',
    '[{"modulo":"ordens","operacao":"visualizar","escopo":"atribuidos"},{"modulo":"ordens","operacao":"editar","escopo":"atribuidos"}]',1);
  INSERT INTO public.servicos(id,tenant_id,nome,created_by,usuario_responsavel_id) VALUES
    (service_id,company_id,'Assigned sheet service',owner_id,worker_id),
    (other_service,company_id,'Unassigned sheet service',owner_id,owner_id);
  PERFORM public.ficha_servico_salvar(service_id,'estoque','{"nome":"Material","custo_unitario":42}',0);
  PERFORM public.ficha_servico_salvar(other_service,'estoque','{"nome":"Other material"}',0);
  result:=public.ficha_responsaveis_disponiveis(service_id,'estoque');
  IF jsonb_array_length(result)<>1 OR result->0->>'id'<>worker_id::text THEN RAISE EXCEPTION 'Lista de responsáveis incorreta'; END IF;
  PERFORM set_config('request.jwt.claim.sub',worker_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker_id,'role','authenticated','session_id',worker_session)::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Sheet worker test');
  BEGIN
    PERFORM public.ficha_responsaveis_disponiveis(service_id,'estoque');
    RAISE EXCEPTION 'Funcionário consultou lista administrativa';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  result:=public.minhas_fichas_servicos(0,'');
  IF jsonb_array_length(result->'itens')<>1 OR result->'itens'->0->>'servico_id'<>service_id::text THEN
    RAISE EXCEPTION 'Lista revelou serviços não atribuídos';
  END IF;
  IF jsonb_array_length(public.minhas_fichas_servicos(0,'inexistente')->'itens')<>0 THEN RAISE EXCEPTION 'Pesquisa ignorada'; END IF;
  BEGIN
    PERFORM public.minhas_fichas_servicos(-1,'');
    RAISE EXCEPTION 'Paginação inválida aceita';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  result:=public.ficha_servico_consultar(service_id,'estoque');
  IF result->'dados' ? 'custo_unitario' OR EXISTS(SELECT 1 FROM jsonb_array_elements(result->'modelo'->'campos') f WHERE f->>'key'='custo_unitario') THEN
    RAISE EXCEPTION 'Custo restrito vazou na ficha';
  END IF;
  PERFORM public.ficha_servico_salvar(service_id,'estoque','{"observacoes":"Conferência do funcionário"}',1);
  BEGIN
    PERFORM public.ficha_responsavel_definir(other_service,'estoque',worker_id,1);
    RAISE EXCEPTION 'Funcionário atribuiu ficha a si mesmo';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.ficha_servico_salvar(service_id,'estoque','{"custo_unitario":1}',2);
    RAISE EXCEPTION 'Funcionário alterou custo restrito';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.ficha_servico_consultar(other_service,'estoque');
    RAISE EXCEPTION 'Funcionário leu serviço não atribuído';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.ficha_servico_salvar(other_service,'estoque','{"nome":"Changed"}',1);
    RAISE EXCEPTION 'Funcionário alterou serviço não atribuído';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',outsider_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',outsider_id,'role','authenticated','session_id',gen_random_uuid())::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Other company sheet test');
  IF jsonb_array_length(public.minhas_fichas_servicos(0,'')->'itens')<>0 THEN RAISE EXCEPTION 'Lista vazou entre empresas'; END IF;
  BEGIN
    PERFORM public.ficha_servico_consultar(service_id,'estoque');
    RAISE EXCEPTION 'Ficha vazou entre empresas';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',owner_session)::text,true);
  BEGIN
    PERFORM public.ficha_responsavel_definir(service_id,'estoque',outsider_id,2);
    RAISE EXCEPTION 'Responsável de outra empresa aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM public.ficha_responsavel_definir(service_id,'estoque',NULL,2);
  PERFORM set_config('request.jwt.claim.sub',worker_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker_id,'role','authenticated','session_id',worker_session)::text,true);
  BEGIN
    PERFORM public.ficha_servico_consultar(service_id,'estoque');
    RAISE EXCEPTION 'Remover atribuição manteve acesso';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',owner_session)::text,true);
  PERFORM public.ficha_responsavel_definir(service_id,'estoque',worker_id,3);
  PERFORM public.gerenciar_funcionario(worker_id,'Sheet worker','estoque',false);
  PERFORM set_config('request.jwt.claim.sub',worker_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker_id,'role','authenticated','session_id',worker_session)::text,true);
  BEGIN
    PERFORM public.ficha_servico_consultar(service_id,'estoque');
    RAISE EXCEPTION 'Funcionário desativado manteve acesso';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$$;
SELECT 'PASS: fichas com isolamento, atribuição, campos restritos, versão, auditoria e desativação' AS result;

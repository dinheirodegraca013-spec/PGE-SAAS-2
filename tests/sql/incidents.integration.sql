DO $$
DECLARE owner_id uuid:=gen_random_uuid();worker uuid:=gen_random_uuid();outsider uuid:=gen_random_uuid();company uuid;service uuid:=gen_random_uuid();incident uuid:=gen_random_uuid();owner_session uuid:=gen_random_uuid();worker_session uuid:=gen_random_uuid();result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);PERFORM set_config('request.jwt.claim.role','service_role',true);PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
    (owner_id,'incident-owner-'||owner_id||'@example.test','{"nome_completo":"Incident owner","razao_social":"Incident fixture"}'),
    (outsider,'incident-other-'||outsider||'@example.test','{"nome_completo":"Other owner","razao_social":"Other incident fixture"}');
  SELECT tenant_id INTO company FROM public.profiles WHERE id=owner_id;
  INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data) VALUES(worker,'incident-worker-'||worker||'@example.test','{"nome_completo":"Incident worker"}',jsonb_build_object('gestio_employee',true,'gestio_criado_por',owner_id,'gestio_tenant_id',company,'gestio_setor','corte'));
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);PERFORM set_config('request.jwt.claim.role','authenticated',true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',owner_session)::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Incident owner');
  INSERT INTO public.servicos(id,tenant_id,nome,created_by) VALUES(service,company,'Incident service',owner_id);
  PERFORM public.ficha_servico_salvar(service,'corte','{}',0);PERFORM public.ficha_responsavel_definir(service,'corte',worker,1);
  PERFORM set_config('request.jwt.claim.sub',worker::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker,'role','authenticated','session_id',worker_session)::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Incident worker');
  PERFORM public.ocorrencia_criar(incident,service,'corte','Falha na serra','Equipamento parou durante o corte.','equipamento','critica');
  result:=public.ocorrencia_criar(incident,service,'corte','Falha na serra','Equipamento parou durante o corte.','equipamento','critica');
  IF result->>'repetida'<>'true' OR jsonb_array_length(public.ocorrencias_ficha_listar(service,'corte')->'itens')<>1 THEN RAISE EXCEPTION 'Ocorrência duplicada ou indisponível'; END IF;
  BEGIN PERFORM public.ocorrencia_resolver(incident,1,'Resolvida pelo próprio operador');RAISE EXCEPTION 'Operador resolveu sem aprovação';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  PERFORM set_config('request.jwt.claim.sub',outsider::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated','session_id',gen_random_uuid())::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Other incident owner');
  IF jsonb_array_length(public.ocorrencias_ficha_listar(service,'corte')->'itens')<>0 THEN RAISE EXCEPTION 'Ocorrência vazou entre empresas'; END IF;
  BEGIN PERFORM public.ocorrencia_resolver(incident,1,'Resolução de outra empresa');RAISE EXCEPTION 'Outra empresa resolveu ocorrência';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',owner_session)::text,true);
  result:=public.ocorrencia_resolver(incident,1,'Manutenção concluída e equipamento testado.');
  IF result->>'status'<>'resolvida' THEN RAISE EXCEPTION 'Resolução não registrada'; END IF;
  BEGIN PERFORM public.ocorrencia_resolver(incident,1,'Tentativa com versão antiga');RAISE EXCEPTION 'Versão antiga aceita';EXCEPTION WHEN serialization_failure THEN NULL;END;
  IF (SELECT count(*) FROM public.audit_logs WHERE registro_id=incident::text AND acao IN ('ocorrencia_criada','ocorrencia_resolvida'))<>2 THEN RAISE EXCEPTION 'Auditoria de ocorrência incompleta'; END IF;
END;
$$;
SELECT 'PASS: ocorrência idempotente, isolamento, aprovação e resolução auditada' AS result;

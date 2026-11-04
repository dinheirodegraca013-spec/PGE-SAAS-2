DO $$
DECLARE owner_id uuid:=gen_random_uuid();company uuid;service uuid:=gen_random_uuid();result jsonb;first_deadline text;checks jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);PERFORM set_config('request.jwt.claim.role','service_role',true);PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(owner_id,'drying-'||owner_id||'@example.test','{"nome_completo":"Drying owner","razao_social":"Drying fixture"}');
  SELECT tenant_id INTO company FROM public.profiles WHERE id=owner_id;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);PERFORM set_config('request.jwt.claim.role','authenticated',true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',gen_random_uuid())::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Drying fixture');
  INSERT INTO public.servicos(id,tenant_id,nome,created_by) VALUES(service,company,'Drying service',owner_id);
  PERFORM public.ficha_servico_salvar(service,'acabamento','{}',0);
  BEGIN PERFORM public.acabamento_secagem_registrar(service,60,1);RAISE EXCEPTION 'Registrou sem iniciar acabamento';EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;END;
  PERFORM public.ficha_execucao_atualizar(service,'acabamento','iniciar',1);
  BEGIN PERFORM public.acabamento_secagem_registrar(service,0,2);RAISE EXCEPTION 'Tempo inválido aceito';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
  result:=public.acabamento_secagem_registrar(service,60,2);first_deadline:=result->>'prevista_ate';
  BEGIN PERFORM public.acabamento_secagem_registrar(service,120,2);RAISE EXCEPTION 'Versão antiga aceita';EXCEPTION WHEN serialization_failure THEN NULL;END;
  result:=public.acabamento_secagem_registrar(service,1,3);
  IF result->>'prevista_ate'<>first_deadline THEN RAISE EXCEPTION 'Prazo ativo de secagem foi encurtado'; END IF;
  IF public.acabamento_secagem_consultar(service)->>'em_secagem'<>'true' THEN RAISE EXCEPTION 'Secagem ativa não exibida'; END IF;
  SELECT jsonb_object_agg(c->>'key',true) INTO checks FROM private.workforce_sheet_templates t,jsonb_array_elements(t.definition->'checklist') c WHERE t.setor='acabamento' AND t.versao=1;
  PERFORM public.ficha_checklist_salvar(service,'acabamento',checks,4);
  BEGIN PERFORM public.ficha_execucao_atualizar(service,'acabamento','concluir',5,'Tentativa de ignorar secagem pelo proprietário');RAISE EXCEPTION 'Concluiu antes de secar';EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;END;
  -- Test-only clock fixture: no real service or production drying time is changed.
  UPDATE private.workforce_service_sheets SET secagem_ate=now()-interval '1 minute' WHERE servico_id=service AND setor='acabamento';
  IF public.acabamento_secagem_consultar(service)->>'em_secagem'<>'false' THEN RAISE EXCEPTION 'Prazo encerrado não reconhecido'; END IF;
  PERFORM public.ficha_execucao_atualizar(service,'acabamento','concluir',5);
END;
$$;
SELECT 'PASS: secagem no servidor, versão, prazo não reduzido e conclusão bloqueada' AS result;

DO $$
DECLARE owner_id uuid:=gen_random_uuid();outsider uuid:=gen_random_uuid();company uuid;service uuid:=gen_random_uuid();other_service uuid:=gen_random_uuid();request_id uuid:=gen_random_uuid();proof jsonb;other_proof jsonb;result jsonb;checks jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);PERFORM set_config('request.jwt.claim.role','service_role',true);PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(owner_id,'acceptance-'||owner_id||'@example.test','{"nome_completo":"Acceptance owner","razao_social":"Acceptance fixture"}');
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(outsider,'acceptance-other-'||outsider||'@example.test','{"nome_completo":"Other acceptance owner","razao_social":"Other acceptance fixture"}');
  SELECT tenant_id INTO company FROM public.profiles WHERE id=owner_id;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);PERFORM set_config('request.jwt.claim.role','authenticated',true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',gen_random_uuid())::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Acceptance fixture');
  INSERT INTO public.servicos(id,tenant_id,nome,created_by) VALUES(service,company,'Acceptance service',owner_id);
  PERFORM public.fluxo_servico_configurar(service,ARRAY['instalacao'],0);
  PERFORM public.ficha_execucao_atualizar(service,'instalacao','iniciar',1);
  proof:=public.anexo_preparar(service,'instalacao','comprovante.pdf','application/pdf',100);
  BEGIN PERFORM public.instalacao_registrar_aceite(request_id,service,'Cliente Teste',(proof->>'id')::uuid,false,2);RAISE EXCEPTION 'Aceite sem confirmação';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
  BEGIN PERFORM public.instalacao_registrar_aceite(request_id,service,'Cliente Teste',(proof->>'id')::uuid,true,2);RAISE EXCEPTION 'Comprovante pendente aceito';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  -- Trusted validated-file metadata fixture; binary verification has separate tests.
  UPDATE private.workforce_attachments SET status='validado',validado_em=now(),sha256=repeat('a',64) WHERE id=(proof->>'id')::uuid;
  INSERT INTO public.servicos(id,tenant_id,nome,created_by) VALUES(other_service,company,'Other proof service',owner_id);
  PERFORM public.ficha_servico_salvar(other_service,'instalacao','{}',0);
  other_proof:=public.anexo_preparar(other_service,'instalacao','outro-comprovante.pdf','application/pdf',100);
  UPDATE private.workforce_attachments SET status='validado',validado_em=now(),sha256=repeat('b',64) WHERE id=(other_proof->>'id')::uuid;
  BEGIN PERFORM public.instalacao_registrar_aceite(request_id,service,'Cliente Teste',(other_proof->>'id')::uuid,true,2);RAISE EXCEPTION 'Aceitou comprovante de outro serviço';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  result:=public.instalacao_registrar_aceite(request_id,service,'Cliente Teste',(proof->>'id')::uuid,true,2);
  IF result->>'versao'<>'3' OR public.ficha_servico_consultar(service,'instalacao')->'checklist'->>'aceite_cliente'<>'true' THEN RAISE EXCEPTION 'Aceite não atualizou checklist'; END IF;
  result:=public.instalacao_registrar_aceite(request_id,service,'Cliente Teste',(proof->>'id')::uuid,true,2);
  IF result->>'repetida'<>'true' THEN RAISE EXCEPTION 'Reenvio duplicou aceite'; END IF;
  BEGIN PERFORM public.instalacao_registrar_aceite(gen_random_uuid(),service,'Cliente Teste',(proof->>'id')::uuid,true,3);RAISE EXCEPTION 'Segundo aceite substituiu o primeiro';EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;END;
  SELECT jsonb_object_agg(c->>'key',true) INTO checks FROM private.workforce_sheet_templates t,jsonb_array_elements(t.definition->'checklist') c WHERE t.setor='instalacao' AND t.versao=1 AND NOT coalesce((c->>'automatic')::boolean,false);
  PERFORM public.ficha_checklist_salvar(service,'instalacao',checks,3);
  PERFORM public.ficha_execucao_atualizar(service,'instalacao','concluir',4);
  IF (SELECT status FROM public.servicos WHERE id=service)<>'Concluido' THEN RAISE EXCEPTION 'Instalação aceita não concluiu serviço'; END IF;
  IF (SELECT count(*) FROM public.audit_logs WHERE acao='instalacao_aceite_registrado' AND registro_id=request_id::text)<>1 THEN RAISE EXCEPTION 'Auditoria do aceite duplicada'; END IF;
  PERFORM set_config('request.jwt.claim.sub',outsider::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated','session_id',gen_random_uuid())::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Other acceptance owner');
  BEGIN PERFORM public.instalacao_registrar_aceite(gen_random_uuid(),service,'Cliente Teste',(proof->>'id')::uuid,true,5);RAISE EXCEPTION 'Outra empresa registrou aceite';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END;
$$;
SELECT 'PASS: aceite com comprovante validado, idempotência e conclusão integrada' AS result;

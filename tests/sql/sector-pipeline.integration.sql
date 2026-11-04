DO $$
DECLARE owner_id uuid:=gen_random_uuid(); company uuid; service uuid:=gen_random_uuid(); checks jsonb; sector text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(owner_id,'pipeline-'||owner_id||'@example.test','{"nome_completo":"Pipeline fixture","razao_social":"Pipeline fixture"}');
  SELECT tenant_id INTO company FROM public.profiles WHERE id=owner_id;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',gen_random_uuid())::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Pipeline fixture');
  INSERT INTO public.servicos(id,tenant_id,nome,created_by) VALUES(service,company,'Pipeline fixture',owner_id);
  IF public.fluxo_servico_consultar(service)->>'configurado'<>'false' THEN RAISE EXCEPTION 'Fluxo inexistente marcado como configurado'; END IF;
  BEGIN PERFORM public.fluxo_servico_configurar(service,ARRAY['corte','corte'],0); RAISE EXCEPTION 'Setor duplicado aceito'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.fluxo_servico_configurar(service,ARRAY['estoque'],0); RAISE EXCEPTION 'Estoque virou etapa de produção'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM public.fluxo_servico_configurar(service,ARRAY['corte','montagem'],0);
  IF public.fluxo_servico_consultar(service)->'setores'<>'["corte","montagem"]'::jsonb THEN RAISE EXCEPTION 'Consulta não refletiu sequência'; END IF;
  IF public.ficha_execucao_consultar(service,'montagem')->>'bloqueio_fluxo'<>'etapa_anterior' THEN RAISE EXCEPTION 'Dependência não exibida'; END IF;
  IF public.ficha_execucao_consultar(service,'corte')->>'inicio_liberado'<>'true' THEN RAISE EXCEPTION 'Primeira etapa bloqueada'; END IF;
  BEGIN PERFORM public.fluxo_servico_configurar(service,ARRAY['corte'],0); RAISE EXCEPTION 'Versão antiga aceita'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN PERFORM public.ficha_execucao_atualizar(service,'montagem','iniciar',1); RAISE EXCEPTION 'Montagem pulou corte'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
  PERFORM public.ficha_servico_salvar(service,'acabamento','{}',0);
  BEGIN PERFORM public.ficha_execucao_atualizar(service,'acabamento','iniciar',1); RAISE EXCEPTION 'Etapa fora do fluxo iniciou'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
  FOREACH sector IN ARRAY ARRAY['corte','montagem'] LOOP
    PERFORM public.ficha_execucao_atualizar(service,sector,'iniciar',1);
    IF public.fluxo_servico_consultar(service)->>'editavel'<>'false' THEN RAISE EXCEPTION 'Fluxo iniciado continua editável'; END IF;
    BEGIN PERFORM public.fluxo_servico_configurar(service,ARRAY['montagem','corte'],1); RAISE EXCEPTION 'Fluxo alterado após início'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
    SELECT jsonb_object_agg(c->>'key',true) INTO checks FROM private.workforce_sheet_templates t,jsonb_array_elements(t.definition->'checklist') c WHERE t.setor=sector AND t.versao=1;
    PERFORM public.ficha_checklist_salvar(service,sector,checks,2);
    PERFORM public.ficha_execucao_atualizar(service,sector,'concluir',3);
    IF sector='corte' AND public.ficha_execucao_consultar(service,'montagem')->>'inicio_liberado'<>'true' THEN RAISE EXCEPTION 'Próxima etapa não liberada'; END IF;
  END LOOP;
  IF (SELECT status FROM public.servicos WHERE id=service)<>'Concluido' THEN RAISE EXCEPTION 'Serviço não concluído com última etapa'; END IF;
  IF (SELECT count(*) FROM public.audit_logs WHERE registro_id=service::text AND acao='etapa_liberada')<>1 THEN RAISE EXCEPTION 'Liberação não auditada'; END IF;
  IF (SELECT count(*) FROM public.audit_logs WHERE registro_id=service::text AND acao='fluxo_concluido')<>1 THEN RAISE EXCEPTION 'Conclusão não auditada'; END IF;
END;
$$;
SELECT 'PASS: fluxo configurável, sequência obrigatória e conclusão integrada' AS result;

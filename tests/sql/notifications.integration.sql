DO $$
DECLARE owner_id uuid:=gen_random_uuid(); worker uuid:=gen_random_uuid(); company uuid; service uuid:=gen_random_uuid();
  owner_session uuid:=gen_random_uuid(); worker_session uuid:=gen_random_uuid(); inbox jsonb; notification uuid; checks jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);PERFORM set_config('request.jwt.claim.role','service_role',true);PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(owner_id,'notify-owner-'||owner_id||'@example.test','{"nome_completo":"Notification owner","razao_social":"Notification fixture"}');
  SELECT tenant_id INTO company FROM public.profiles WHERE id=owner_id;
  INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data) VALUES(worker,'notify-worker-'||worker||'@example.test','{"nome_completo":"Notification worker"}',jsonb_build_object('gestio_employee',true,'gestio_criado_por',owner_id,'gestio_tenant_id',company,'gestio_setor','corte'));
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);PERFORM set_config('request.jwt.claim.role','authenticated',true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',owner_session)::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Notification owner');
  PERFORM public.funcionario_configurar(worker,'Notification worker','Operador','corte',ARRAY['montagem'],'ativo',
    '[{"modulo":"ordens","operacao":"visualizar","escopo":"atribuidos"},{"modulo":"notificacoes","operacao":"visualizar","escopo":"atribuidos"}]',1);
  INSERT INTO public.servicos(id,tenant_id,nome,created_by) VALUES(service,company,'Notification service',owner_id);
  PERFORM public.fluxo_servico_configurar(service,ARRAY['corte','montagem'],0);
  PERFORM public.ficha_responsavel_definir(service,'corte',worker,1);
  PERFORM public.ficha_responsavel_definir(service,'montagem',worker,1);
  PERFORM public.ficha_execucao_atualizar(service,'corte','iniciar',2);
  SELECT jsonb_object_agg(c->>'key',true) INTO checks FROM private.workforce_sheet_templates t,jsonb_array_elements(t.definition->'checklist') c WHERE t.setor='corte' AND t.versao=1;
  PERFORM public.ficha_checklist_salvar(service,'corte',checks,3);
  PERFORM public.ficha_execucao_atualizar(service,'corte','concluir',4);
  IF (SELECT count(*) FROM private.workforce_notifications WHERE usuario_id=worker AND evento='etapa_liberada')<>1 THEN RAISE EXCEPTION 'Liberação não notificou'; END IF;
  SELECT id INTO notification FROM private.workforce_notifications WHERE usuario_id=worker LIMIT 1;
  BEGIN PERFORM public.notificacao_marcar_lida(notification);RAISE EXCEPTION 'Proprietário marcou notificação alheia';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  PERFORM set_config('request.jwt.claim.sub',worker::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker,'role','authenticated','session_id',worker_session)::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Notification worker');
  inbox:=public.minhas_notificacoes();
  IF jsonb_array_length(inbox->'itens')<>3 OR inbox->>'nao_lidas'<>'3' THEN RAISE EXCEPTION 'Caixa de notificações incorreta'; END IF;
  PERFORM public.notificacao_marcar_lida(notification);PERFORM public.notificacao_marcar_lida(notification);
  IF public.minhas_notificacoes()->>'nao_lidas'<>'2' THEN RAISE EXCEPTION 'Leitura não idempotente'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',owner_session)::text,true);
  PERFORM public.ficha_responsavel_definir(service,'montagem',NULL,2);
  PERFORM set_config('request.jwt.claim.sub',worker::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',worker,'role','authenticated','session_id',worker_session)::text,true);
  IF jsonb_array_length(public.minhas_notificacoes()->'itens')<>1 THEN RAISE EXCEPTION 'Notificação revelou ficha sem atribuição'; END IF;
END;
$$;
SELECT 'PASS: notificações por atribuição e liberação, leitura idempotente e isolamento' AS result;

BEGIN;
ALTER TABLE private.workforce_notifications
  ADD COLUMN tarefa_id uuid REFERENCES private.workforce_tasks(id),
  ALTER COLUMN servico_id DROP NOT NULL,
  DROP CONSTRAINT workforce_notifications_evento_check,
  ADD CONSTRAINT workforce_notifications_evento_check CHECK(evento IN ('ficha_atribuida','etapa_liberada','tarefa_atribuida')),
  ADD CONSTRAINT workforce_notification_resource CHECK(tarefa_id IS NOT NULL OR servico_id IS NOT NULL);

CREATE FUNCTION private.notify_task_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE task private.workforce_tasks%ROWTYPE;
BEGIN
  SELECT * INTO task FROM private.workforce_tasks WHERE id=NEW.registro_id::uuid AND tenant_id=NEW.tenant_id;
  IF FOUND THEN
    INSERT INTO private.workforce_notifications(tenant_id,usuario_id,servico_id,tarefa_id,setor,evento,auditoria_id)
      VALUES(task.tenant_id,task.responsavel_id,task.servico_id,task.id,task.setor,'tarefa_atribuida',NEW.id)
      ON CONFLICT(auditoria_id,usuario_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.notify_task_assignment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER workforce_task_notification AFTER INSERT ON public.audit_logs
  FOR EACH ROW WHEN(NEW.acao='tarefa_criada' AND NEW.tabela='workforce_tasks') EXECUTE FUNCTION private.notify_task_assignment();

CREATE OR REPLACE FUNCTION private.notification_visible(p_notification private.workforce_notifications) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_notification.usuario_id=auth.uid()
    AND private.operational_permission(p_notification.tenant_id,'notificacoes','visualizar',p_notification.setor,true)
    AND CASE WHEN p_notification.tarefa_id IS NOT NULL THEN
      EXISTS(SELECT 1 FROM private.workforce_tasks t WHERE t.id=p_notification.tarefa_id AND t.tenant_id=p_notification.tenant_id
        AND private.operational_permission(t.tenant_id,'tarefas','visualizar',t.setor,t.responsavel_id=auth.uid()))
    ELSE EXISTS(SELECT 1 FROM private.workforce_service_sheets s WHERE s.servico_id=p_notification.servico_id
      AND s.tenant_id=p_notification.tenant_id AND s.setor=p_notification.setor
      AND private.operational_permission(s.tenant_id,'ordens','visualizar',s.setor,s.responsavel_id=auth.uid())) END;
$$;

CREATE OR REPLACE FUNCTION public.minhas_notificacoes(p_pagina integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE items jsonb; unread bigint;
BEGIN
  PERFORM private.require_authorized_session();
  IF p_pagina IS NULL OR p_pagina<0 OR p_pagina>100000 THEN RAISE EXCEPTION 'Página inválida.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(page)),'[]') INTO items FROM (
    SELECT n.id,n.servico_id,n.tarefa_id,n.setor,n.evento,n.criada_em,n.lida_em
      FROM private.workforce_notifications n WHERE n.usuario_id=auth.uid() AND private.notification_visible(n)
      ORDER BY n.criada_em DESC,n.id LIMIT 21 OFFSET p_pagina*20
  ) page;
  SELECT count(*) INTO unread FROM private.workforce_notifications n WHERE n.usuario_id=auth.uid() AND n.lida_em IS NULL AND private.notification_visible(n);
  RETURN jsonb_build_object('itens',CASE WHEN jsonb_array_length(items)>20 THEN items-20 ELSE items END,
    'tem_mais',jsonb_array_length(items)>20,'nao_lidas',unread);
END;
$$;
CREATE FUNCTION public.tarefa_consultar(p_tarefa uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE task private.workforce_tasks%ROWTYPE;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO task FROM private.workforce_tasks WHERE id=p_tarefa;
  IF NOT FOUND OR NOT private.operational_permission(task.tenant_id,'tarefas','visualizar',task.setor,task.responsavel_id=auth.uid()) THEN
    RAISE EXCEPTION 'Tarefa indisponível.' USING ERRCODE='42501';
  END IF;
  RETURN to_jsonb(task)-'requisicao'-'tenant_id';
END;
$$;
REVOKE ALL ON FUNCTION public.tarefa_consultar(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tarefa_consultar(uuid) TO authenticated;
COMMIT;

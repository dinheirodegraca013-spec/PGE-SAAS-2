BEGIN;
CREATE TABLE private.workforce_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  servico_id uuid NOT NULL REFERENCES public.servicos(id),
  setor text NOT NULL,
  evento text NOT NULL CHECK(evento IN ('ficha_atribuida','etapa_liberada')),
  auditoria_id bigint NOT NULL REFERENCES public.audit_logs(id),
  criada_em timestamptz NOT NULL DEFAULT now(),
  lida_em timestamptz,
  FOREIGN KEY(tenant_id,usuario_id) REFERENCES public.profiles(tenant_id,id),
  UNIQUE(auditoria_id,usuario_id)
);
ALTER TABLE private.workforce_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.workforce_notifications FROM PUBLIC,anon,authenticated;
CREATE INDEX workforce_notifications_inbox ON private.workforce_notifications(usuario_id,criada_em DESC,id);

CREATE FUNCTION private.notify_operational_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE recipient uuid; sector text; event text;
BEGIN
  IF NEW.acao='ficha_responsavel_alterado' AND NEW.tabela='workforce_service_sheets' THEN
    recipient:=(NEW.detalhes->>'responsavel')::uuid;
    sector:=NEW.detalhes->>'setor';event:='ficha_atribuida';
  ELSIF NEW.acao='etapa_liberada' AND NEW.tabela='workforce_service_flows' THEN
    sector:=NEW.detalhes->>'destino';event:='etapa_liberada';
    SELECT responsavel_id INTO recipient FROM private.workforce_service_sheets
      WHERE servico_id=NEW.registro_id::uuid AND tenant_id=NEW.tenant_id AND setor=sector;
  ELSE RETURN NEW; END IF;
  IF recipient IS NOT NULL THEN
    INSERT INTO private.workforce_notifications(tenant_id,usuario_id,servico_id,setor,evento,auditoria_id)
      VALUES(NEW.tenant_id,recipient,NEW.registro_id::uuid,sector,event,NEW.id)
      ON CONFLICT(auditoria_id,usuario_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.notify_operational_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER workforce_event_notification AFTER INSERT ON public.audit_logs
  FOR EACH ROW WHEN(NEW.acao IN ('ficha_responsavel_alterado','etapa_liberada'))
  EXECUTE FUNCTION private.notify_operational_event();

CREATE FUNCTION private.notification_visible(p_notification private.workforce_notifications) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_notification.usuario_id=auth.uid()
    AND private.operational_permission(p_notification.tenant_id,'notificacoes','visualizar',p_notification.setor,true)
    AND EXISTS(SELECT 1 FROM private.workforce_service_sheets s WHERE s.servico_id=p_notification.servico_id
      AND s.tenant_id=p_notification.tenant_id AND s.setor=p_notification.setor
      AND private.operational_permission(s.tenant_id,'ordens','visualizar',s.setor,s.responsavel_id=auth.uid()));
$$;
REVOKE ALL ON FUNCTION private.notification_visible(private.workforce_notifications) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.minhas_notificacoes(p_pagina integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE items jsonb; unread bigint;
BEGIN
  PERFORM private.require_authorized_session();
  IF p_pagina IS NULL OR p_pagina<0 OR p_pagina>100000 THEN RAISE EXCEPTION 'Página inválida.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(page)),'[]') INTO items FROM (
    SELECT n.id,n.servico_id,n.setor,n.evento,n.criada_em,n.lida_em
      FROM private.workforce_notifications n WHERE n.usuario_id=auth.uid() AND private.notification_visible(n)
      ORDER BY n.criada_em DESC,n.id LIMIT 21 OFFSET p_pagina*20
  ) page;
  SELECT count(*) INTO unread FROM private.workforce_notifications n WHERE n.usuario_id=auth.uid() AND n.lida_em IS NULL AND private.notification_visible(n);
  RETURN jsonb_build_object('itens',CASE WHEN jsonb_array_length(items)>20 THEN items-20 ELSE items END,
    'tem_mais',jsonb_array_length(items)>20,'nao_lidas',unread);
END;
$$;
REVOKE ALL ON FUNCTION public.minhas_notificacoes(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.minhas_notificacoes(integer) TO authenticated;

CREATE FUNCTION public.notificacao_marcar_lida(p_notificacao uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE notification private.workforce_notifications%ROWTYPE;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO notification FROM private.workforce_notifications WHERE id=p_notificacao FOR UPDATE;
  IF NOT FOUND OR NOT private.notification_visible(notification) THEN
    RAISE EXCEPTION 'Notificação indisponível.' USING ERRCODE='42501';
  END IF;
  UPDATE private.workforce_notifications SET lida_em=coalesce(lida_em,now()) WHERE id=p_notificacao RETURNING * INTO notification;
  RETURN jsonb_build_object('id',notification.id,'lida_em',notification.lida_em);
END;
$$;
REVOKE ALL ON FUNCTION public.notificacao_marcar_lida(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.notificacao_marcar_lida(uuid) TO authenticated;
COMMIT;

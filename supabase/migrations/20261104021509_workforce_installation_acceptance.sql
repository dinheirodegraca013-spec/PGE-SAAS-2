BEGIN;
CREATE TABLE private.workforce_installation_acceptances(
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  servico_id uuid NOT NULL UNIQUE REFERENCES public.servicos(id),
  cliente_nome text NOT NULL CHECK(length(btrim(cliente_nome)) BETWEEN 2 AND 120),
  comprovante_id uuid NOT NULL REFERENCES private.workforce_attachments(id),
  observacoes text NOT NULL CHECK(length(observacoes)<=2000),
  registrado_por uuid NOT NULL,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  ficha_versao integer NOT NULL,
  FOREIGN KEY(tenant_id,registrado_por) REFERENCES public.profiles(tenant_id,id)
);
ALTER TABLE private.workforce_installation_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.workforce_installation_acceptances FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.instalacao_registrar_aceite(p_requisicao uuid,p_servico uuid,p_cliente_nome text,p_comprovante uuid,p_confirmacao boolean,p_versao integer,p_observacoes text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sheet private.workforce_service_sheets%ROWTYPE; existing private.workforce_installation_acceptances%ROWTYPE; result_version integer;
BEGIN
  PERFORM private.require_authorized_session();
  PERFORM 1 FROM public.servicos WHERE id=p_servico FOR UPDATE;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor='instalacao' FOR UPDATE;
  IF NOT FOUND OR NOT private.operational_permission(sheet.tenant_id,'ordens','concluir','instalacao',sheet.responsavel_id=auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para registrar o aceite desta instalação.' USING ERRCODE='42501';
  END IF;
  IF p_requisicao IS NULL OR p_cliente_nome IS NULL OR length(btrim(p_cliente_nome)) NOT BETWEEN 2 AND 120
    OR p_comprovante IS NULL OR p_confirmacao IS DISTINCT FROM true OR p_observacoes IS NULL OR length(p_observacoes)>2000 THEN
    RAISE EXCEPTION 'Informe cliente, comprovante e confirmação do aceite recebido.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO existing FROM private.workforce_installation_acceptances WHERE id=p_requisicao;
  IF FOUND THEN
    IF existing.tenant_id<>sheet.tenant_id OR existing.servico_id<>p_servico OR existing.registrado_por<>auth.uid()
      OR existing.cliente_nome<>btrim(p_cliente_nome) OR existing.comprovante_id<>p_comprovante OR existing.observacoes<>p_observacoes THEN
      RAISE EXCEPTION 'Identificador de requisição já utilizado.' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('id',existing.id,'versao',sheet.versao,'repetida',true);
  END IF;
  IF sheet.status<>'em_andamento' THEN RAISE EXCEPTION 'Inicie a instalação antes de registrar o aceite.' USING ERRCODE='55000'; END IF;
  IF p_versao IS DISTINCT FROM sheet.versao THEN RAISE EXCEPTION 'Ficha alterada. Recarregue.' USING ERRCODE='40001'; END IF;
  IF EXISTS(SELECT 1 FROM private.workforce_installation_acceptances WHERE servico_id=p_servico) THEN
    RAISE EXCEPTION 'O aceite desta instalação já foi registrado.' USING ERRCODE='55000';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM private.workforce_attachments a WHERE a.id=p_comprovante AND a.tenant_id=sheet.tenant_id
    AND a.servico_id=p_servico AND a.setor='instalacao' AND a.status='validado') THEN
    RAISE EXCEPTION 'Selecione um comprovante validado desta instalação.' USING ERRCODE='42501';
  END IF;
  UPDATE private.workforce_service_sheets SET checklist=checklist||'{"aceite_cliente":true}'::jsonb,versao=versao+1,
    atualizado_por=auth.uid(),atualizado_em=now() WHERE servico_id=p_servico AND setor='instalacao' RETURNING versao INTO result_version;
  INSERT INTO private.workforce_installation_acceptances(id,tenant_id,servico_id,cliente_nome,comprovante_id,observacoes,registrado_por,ficha_versao)
    VALUES(p_requisicao,sheet.tenant_id,p_servico,btrim(p_cliente_nome),p_comprovante,p_observacoes,auth.uid(),result_version);
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(sheet.tenant_id,auth.uid(),'instalacao_aceite_registrado','workforce_installation_acceptances',p_requisicao::text,
      jsonb_build_object('servico_id',p_servico,'setor','instalacao','comprovante_id',p_comprovante,'ficha_versao',result_version));
  RETURN jsonb_build_object('id',p_requisicao,'versao',result_version,'repetida',false);
END;
$$;
REVOKE ALL ON FUNCTION public.instalacao_registrar_aceite(uuid,uuid,text,uuid,boolean,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.instalacao_registrar_aceite(uuid,uuid,text,uuid,boolean,integer,text) TO authenticated;
COMMIT;

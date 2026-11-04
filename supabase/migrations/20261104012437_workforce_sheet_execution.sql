BEGIN;
ALTER TABLE private.workforce_service_sheets
  ADD COLUMN status text NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','em_andamento','pausada','concluida')),
  ADD COLUMN iniciada_em timestamptz,
  ADD COLUMN concluida_em timestamptz;

CREATE FUNCTION private.guard_completed_sheet() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF OLD.status='concluida' AND NEW.status='concluida' AND
    (OLD.dados IS DISTINCT FROM NEW.dados OR OLD.checklist IS DISTINCT FROM NEW.checklist) THEN
    RAISE EXCEPTION 'Ficha concluída não pode ser alterada.' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_completed_sheet() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER workforce_completed_sheet BEFORE UPDATE ON private.workforce_service_sheets
  FOR EACH ROW EXECUTE FUNCTION private.guard_completed_sheet();

CREATE FUNCTION public.ficha_execucao_consultar(p_servico uuid,p_setor text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; sheet private.workforce_service_sheets%ROWTYPE;
BEGIN
  result:=public.ficha_servico_consultar(p_servico,p_setor);
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor;
  RETURN result||jsonb_build_object('status',sheet.status,'iniciada_em',sheet.iniciada_em,'concluida_em',sheet.concluida_em);
END;
$$;
REVOKE ALL ON FUNCTION public.ficha_execucao_consultar(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ficha_execucao_consultar(uuid,text) TO authenticated;

CREATE FUNCTION public.ficha_execucao_atualizar(p_servico uuid,p_setor text,p_acao text,p_versao integer,p_justificativa text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE service public.servicos%ROWTYPE; sheet private.workforce_service_sheets%ROWTYPE;
  operation text; next_status text; template jsonb; missing jsonb; result private.workforce_service_sheets%ROWTYPE;
BEGIN
  PERFORM private.require_authorized_session();
  operation:=CASE p_acao WHEN 'iniciar' THEN 'iniciar' WHEN 'pausar' THEN 'pausar' WHEN 'concluir' THEN 'concluir' END;
  IF operation IS NULL THEN RAISE EXCEPTION 'Ação inválida.' USING ERRCODE='22023'; END IF;
  SELECT * INTO service FROM public.servicos WHERE id=p_servico FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ficha indisponível.' USING ERRCODE='42501'; END IF;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor AND tenant_id=service.tenant_id FOR UPDATE;
  IF NOT FOUND OR NOT private.operational_permission(service.tenant_id,'ordens',operation,p_setor,sheet.responsavel_id=auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação.' USING ERRCODE='42501';
  END IF;
  IF p_versao IS DISTINCT FROM sheet.versao THEN RAISE EXCEPTION 'Ficha alterada. Recarregue.' USING ERRCODE='40001'; END IF;
  IF p_acao='iniciar' AND sheet.status IN ('pendente','pausada') THEN next_status:='em_andamento';
  ELSIF p_acao='pausar' AND sheet.status='em_andamento' THEN next_status:='pausada';
  ELSIF p_acao='concluir' AND sheet.status='em_andamento' THEN next_status:='concluida';
  ELSE RAISE EXCEPTION 'Transição indisponível para a situação atual.' USING ERRCODE='55000'; END IF;
  IF next_status='concluida' THEN
    SELECT definition INTO template FROM private.workforce_sheet_templates WHERE setor=sheet.setor AND versao=sheet.template_versao;
    SELECT coalesce(jsonb_agg(c->>'key'),'[]') INTO missing FROM jsonb_array_elements(template->'checklist') c
      WHERE sheet.checklist->(c->>'key') IS DISTINCT FROM 'true'::jsonb;
    IF jsonb_array_length(missing)>0 THEN
      -- Automatic evidence items cannot be overridden by checking a manual box.
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(template->'checklist') c WHERE coalesce((c->>'automatic')::boolean,false)
        AND sheet.checklist->(c->>'key') IS DISTINCT FROM 'true'::jsonb) THEN
        RAISE EXCEPTION 'Falta evidência obrigatória para concluir.' USING ERRCODE='55000';
      END IF;
      IF NOT private.operational_permission(service.tenant_id,'ordens','aprovar',p_setor,sheet.responsavel_id=auth.uid())
        OR p_justificativa IS NULL OR length(btrim(p_justificativa))<10 OR length(p_justificativa)>2000 THEN
        RAISE EXCEPTION 'Conclua o checklist obrigatório ou solicite aprovação com justificativa.' USING ERRCODE='55000';
      END IF;
    END IF;
  END IF;
  UPDATE private.workforce_service_sheets SET status=next_status,versao=versao+1,atualizado_por=auth.uid(),atualizado_em=now(),
    iniciada_em=CASE WHEN next_status='em_andamento' THEN coalesce(iniciada_em,now()) ELSE iniciada_em END,
    concluida_em=CASE WHEN next_status='concluida' THEN now() ELSE concluida_em END
    WHERE servico_id=p_servico AND setor=p_setor RETURNING * INTO result;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(service.tenant_id,auth.uid(),'ficha_execucao_'||p_acao,'workforce_service_sheets',p_servico::text,
      jsonb_build_object('setor',p_setor,'antes',sheet.status,'depois',next_status,'versao',result.versao,
        'checklist_pendente',coalesce(missing,'[]'),'justificativa',p_justificativa));
  RETURN jsonb_build_object('status',result.status,'versao',result.versao,'iniciada_em',result.iniciada_em,'concluida_em',result.concluida_em,
    'inicio_liberado',result.status='pausada','bloqueio_fluxo',NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.ficha_execucao_atualizar(uuid,text,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ficha_execucao_atualizar(uuid,text,text,integer,text) TO authenticated;
COMMIT;

BEGIN;
ALTER TABLE private.workforce_service_sheets ADD COLUMN secagem_iniciada_em timestamptz,ADD COLUMN secagem_ate timestamptz;

CREATE FUNCTION public.acabamento_secagem_consultar(p_servico uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; sheet private.workforce_service_sheets%ROWTYPE;
BEGIN
  PERFORM public.ficha_servico_consultar(p_servico,'acabamento');
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor='acabamento';
  RETURN jsonb_build_object('iniciada_em',sheet.secagem_iniciada_em,'prevista_ate',sheet.secagem_ate,
    'em_secagem',coalesce(sheet.secagem_ate>now(),false),'servidor_agora',now(),'versao',sheet.versao);
END;
$$;
REVOKE ALL ON FUNCTION public.acabamento_secagem_consultar(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.acabamento_secagem_consultar(uuid) TO authenticated;

CREATE FUNCTION public.acabamento_secagem_registrar(p_servico uuid,p_minutos integer,p_versao integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sheet private.workforce_service_sheets%ROWTYPE; deadline timestamptz; result_version integer;
BEGIN
  PERFORM private.require_authorized_session();
  PERFORM 1 FROM public.servicos WHERE id=p_servico FOR UPDATE;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor='acabamento' FOR UPDATE;
  IF NOT FOUND OR NOT private.operational_permission(sheet.tenant_id,'ordens','editar','acabamento',sheet.responsavel_id=auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para registrar secagem.' USING ERRCODE='42501';
  END IF;
  IF p_versao IS DISTINCT FROM sheet.versao THEN RAISE EXCEPTION 'Ficha alterada. Recarregue.' USING ERRCODE='40001'; END IF;
  IF sheet.status<>'em_andamento' THEN RAISE EXCEPTION 'Inicie o acabamento antes de registrar a secagem.' USING ERRCODE='55000'; END IF;
  IF p_minutos IS NULL OR p_minutos NOT BETWEEN 1 AND 10080 THEN RAISE EXCEPTION 'Informe de 1 a 10.080 minutos.' USING ERRCODE='22023'; END IF;
  deadline:=greatest(sheet.secagem_ate,now()+make_interval(mins=>p_minutos));
  UPDATE private.workforce_service_sheets SET secagem_iniciada_em=CASE WHEN sheet.secagem_ate>now() THEN sheet.secagem_iniciada_em ELSE now() END,
    secagem_ate=deadline,versao=versao+1,atualizado_por=auth.uid(),atualizado_em=now()
    WHERE servico_id=p_servico AND setor='acabamento' RETURNING versao INTO result_version;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(sheet.tenant_id,auth.uid(),'acabamento_secagem_registrada','workforce_service_sheets',p_servico::text,
      jsonb_build_object('setor','acabamento','prazo_anterior',sheet.secagem_ate,'prazo',deadline,'minutos',p_minutos,'versao',result_version));
  RETURN jsonb_build_object('prevista_ate',deadline,'em_secagem',true,'servidor_agora',now(),'versao',result_version);
END;
$$;
REVOKE ALL ON FUNCTION public.acabamento_secagem_registrar(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.acabamento_secagem_registrar(uuid,integer,integer) TO authenticated;

CREATE FUNCTION private.guard_finishing_drying() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.setor='acabamento' AND NEW.status='concluida' AND OLD.status<>'concluida' AND OLD.secagem_ate>now() THEN
    RAISE EXCEPTION 'Aguarde o prazo de secagem antes de concluir o acabamento.' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_finishing_drying() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER workforce_finishing_drying BEFORE UPDATE OF status ON private.workforce_service_sheets
  FOR EACH ROW EXECUTE FUNCTION private.guard_finishing_drying();
COMMIT;

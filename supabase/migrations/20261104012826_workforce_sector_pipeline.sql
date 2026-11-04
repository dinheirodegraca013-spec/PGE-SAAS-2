BEGIN;
CREATE TABLE private.workforce_service_flows (
  servico_id uuid PRIMARY KEY REFERENCES public.servicos(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  setores text[] NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  atualizado_por uuid NOT NULL REFERENCES auth.users(id),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CHECK(cardinality(setores) BETWEEN 1 AND 5)
);
ALTER TABLE private.workforce_service_flows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.workforce_service_flows FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.fluxo_servico_configurar(p_servico uuid,p_setores text[],p_versao integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE service public.servicos%ROWTYPE; flow private.workforce_service_flows%ROWTYPE; sector text; result_version integer;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO service FROM public.servicos WHERE id=p_servico FOR UPDATE;
  IF NOT FOUND OR NOT private.operational_owner(service.tenant_id) THEN
    RAISE EXCEPTION 'Somente o proprietário pode configurar este fluxo.' USING ERRCODE='42501';
  END IF;
  IF p_setores IS NULL OR cardinality(p_setores) NOT BETWEEN 1 AND 5 OR array_ndims(p_setores)<>1
    OR EXISTS(SELECT 1 FROM unnest(p_setores) s WHERE s IS NULL OR s NOT IN ('financeiro','corte','montagem','acabamento','instalacao'))
    OR (SELECT count(DISTINCT s) FROM unnest(p_setores) s)<>cardinality(p_setores) THEN
    RAISE EXCEPTION 'Escolha de um a cinco setores distintos; estoque é apoio.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO flow FROM private.workforce_service_flows WHERE servico_id=p_servico FOR UPDATE;
  IF p_versao IS DISTINCT FROM coalesce(flow.versao,0) THEN RAISE EXCEPTION 'Fluxo alterado. Recarregue.' USING ERRCODE='40001'; END IF;
  IF EXISTS(SELECT 1 FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor<>'estoque' AND status<>'pendente') THEN
    RAISE EXCEPTION 'O fluxo não pode mudar após o início da execução.' USING ERRCODE='55000';
  END IF;
  FOREACH sector IN ARRAY p_setores LOOP
    IF NOT EXISTS(SELECT 1 FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=sector) THEN
      PERFORM public.ficha_servico_salvar(p_servico,sector,'{}',0);
    END IF;
  END LOOP;
  INSERT INTO private.workforce_service_flows(servico_id,tenant_id,setores,atualizado_por)
    VALUES(p_servico,service.tenant_id,p_setores,auth.uid()) ON CONFLICT(servico_id) DO UPDATE SET
      setores=EXCLUDED.setores,versao=private.workforce_service_flows.versao+1,atualizado_por=auth.uid(),atualizado_em=now()
    RETURNING versao INTO result_version;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(service.tenant_id,auth.uid(),'fluxo_configurado','workforce_service_flows',p_servico::text,
      jsonb_build_object('antes',flow.setores,'depois',p_setores,'versao',result_version));
  RETURN jsonb_build_object('setores',p_setores,'versao',result_version);
END;
$$;
REVOKE ALL ON FUNCTION public.fluxo_servico_configurar(uuid,text[],integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fluxo_servico_configurar(uuid,text[],integer) TO authenticated;

CREATE FUNCTION private.guard_sector_pipeline() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE flow private.workforce_service_flows%ROWTYPE; position integer;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.setor='estoque' THEN RETURN NEW; END IF;
  SELECT * INTO flow FROM private.workforce_service_flows WHERE servico_id=NEW.servico_id AND tenant_id=NEW.tenant_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  position:=array_position(flow.setores,NEW.setor);
  IF position IS NULL THEN RAISE EXCEPTION 'Este setor não participa do fluxo configurado.' USING ERRCODE='55000'; END IF;
  IF NEW.status='em_andamento' AND EXISTS(
    SELECT 1 FROM unnest(flow.setores) WITH ORDINALITY previous(sector,step)
      LEFT JOIN private.workforce_service_sheets s ON s.servico_id=NEW.servico_id AND s.tenant_id=NEW.tenant_id AND s.setor=previous.sector
    WHERE previous.step<position AND s.status IS DISTINCT FROM 'concluida'
  ) THEN RAISE EXCEPTION 'Aguarde a conclusão das etapas anteriores.' USING ERRCODE='55000'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_sector_pipeline() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER workforce_sector_pipeline BEFORE UPDATE OF status ON private.workforce_service_sheets
  FOR EACH ROW EXECUTE FUNCTION private.guard_sector_pipeline();

CREATE FUNCTION private.audit_sector_release() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE flow private.workforce_service_flows%ROWTYPE; position integer; next_sector text;
BEGIN
  IF NEW.status<>'concluida' OR OLD.status='concluida' OR NEW.setor='estoque' THEN RETURN NEW; END IF;
  SELECT * INTO flow FROM private.workforce_service_flows WHERE servico_id=NEW.servico_id AND tenant_id=NEW.tenant_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  position:=array_position(flow.setores,NEW.setor);next_sector:=flow.setores[position+1];
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(NEW.tenant_id,auth.uid(),CASE WHEN next_sector IS NULL THEN 'fluxo_concluido' ELSE 'etapa_liberada' END,'workforce_service_flows',NEW.servico_id::text,
      jsonb_build_object('origem',NEW.setor,'destino',next_sector,'status_anterior',OLD.status,'status','concluida','versao_ficha',NEW.versao));
  IF next_sector IS NULL THEN
    UPDATE public.servicos SET status='Concluido',updated_at=now() WHERE id=NEW.servico_id AND tenant_id=NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.audit_sector_release() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER workforce_sector_release AFTER UPDATE OF status ON private.workforce_service_sheets
  FOR EACH ROW EXECUTE FUNCTION private.audit_sector_release();
CREATE FUNCTION public.fluxo_servico_consultar(p_servico uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; flow private.workforce_service_flows%ROWTYPE;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT tenant_id INTO company FROM public.servicos WHERE id=p_servico;
  IF company IS NULL OR NOT private.operational_owner(company) THEN
    RAISE EXCEPTION 'Somente o proprietário pode consultar a configuração do fluxo.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO flow FROM private.workforce_service_flows WHERE servico_id=p_servico AND tenant_id=company;
  RETURN jsonb_build_object('setores',coalesce(flow.setores,ARRAY['financeiro','corte','montagem','acabamento','instalacao']),
    'versao',coalesce(flow.versao,0),'configurado',flow.servico_id IS NOT NULL,
    'editavel',NOT EXISTS(SELECT 1 FROM private.workforce_service_sheets WHERE servico_id=p_servico AND tenant_id=company AND setor<>'estoque' AND status<>'pendente'));
END;
$$;
REVOKE ALL ON FUNCTION public.fluxo_servico_consultar(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fluxo_servico_consultar(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.ficha_execucao_consultar(p_servico uuid,p_setor text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; sheet private.workforce_service_sheets%ROWTYPE; flow private.workforce_service_flows%ROWTYPE;
  position integer; blocked text;
BEGIN
  result:=public.ficha_servico_consultar(p_servico,p_setor);
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor;
  SELECT * INTO flow FROM private.workforce_service_flows WHERE servico_id=p_servico AND tenant_id=sheet.tenant_id;
  IF FOUND AND p_setor<>'estoque' THEN
    position:=array_position(flow.setores,p_setor);
    IF position IS NULL THEN blocked:='fora_fluxo';
    ELSIF EXISTS(SELECT 1 FROM unnest(flow.setores) WITH ORDINALITY previous(sector,step)
      LEFT JOIN private.workforce_service_sheets s ON s.servico_id=p_servico AND s.tenant_id=sheet.tenant_id AND s.setor=previous.sector
      WHERE previous.step<position AND s.status IS DISTINCT FROM 'concluida') THEN blocked:='etapa_anterior'; END IF;
  END IF;
  RETURN result||jsonb_build_object('status',sheet.status,'iniciada_em',sheet.iniciada_em,'concluida_em',sheet.concluida_em,
    'inicio_liberado',blocked IS NULL AND sheet.status IN ('pendente','pausada'),'bloqueio_fluxo',blocked);
END;
$$;
COMMIT;

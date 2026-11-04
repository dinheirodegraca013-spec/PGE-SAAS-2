BEGIN;

CREATE TABLE private.workforce_sheet_execution_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  servico_id uuid NOT NULL REFERENCES public.servicos(id),
  setor text NOT NULL CHECK (setor IN ('corte','montagem')),
  tipo text NOT NULL CHECK (tipo IN ('produzido','defeito','desperdicio')),
  quantidade numeric(14,3) NOT NULL CHECK (quantidade > 0 AND quantidade < 100000000 AND quantidade::text <> 'NaN'),
  unidade text NOT NULL CHECK (length(unidade) BETWEEN 1 AND 40 AND unidade !~ '[[:cntrl:]]'),
  descricao text NOT NULL DEFAULT '' CHECK (length(descricao) <= 1000 AND descricao !~ '[[:cntrl:]]'),
  requisicao_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,requisicao_id)
);
ALTER TABLE private.workforce_sheet_execution_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.workforce_sheet_execution_entries FROM PUBLIC,anon,authenticated;
CREATE INDEX workforce_sheet_execution_entries_service ON private.workforce_sheet_execution_entries(tenant_id,servico_id,setor,criado_em DESC);

CREATE FUNCTION public.ficha_producao_consultar(p_servico uuid,p_setor text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE sheet private.workforce_service_sheets%ROWTYPE; entries jsonb; totals jsonb;
BEGIN
  PERFORM public.ficha_servico_consultar(p_servico,p_setor);
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor;
  IF p_setor NOT IN ('corte','montagem') THEN RAISE EXCEPTION 'Setor sem controle de produção.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.criado_em DESC,x.id),'[]') INTO entries
    FROM (SELECT id,tipo,quantidade,unidade,descricao,criado_em
      FROM private.workforce_sheet_execution_entries
      WHERE servico_id=p_servico AND setor=p_setor AND tenant_id=sheet.tenant_id
      ORDER BY criado_em DESC,id LIMIT 100) x;
  SELECT jsonb_build_object(
    'produzido',coalesce(sum(quantidade) FILTER (WHERE tipo='produzido'),0),
    'defeito',coalesce(sum(quantidade) FILTER (WHERE tipo='defeito'),0),
    'desperdicio',coalesce(sum(quantidade) FILTER (WHERE tipo='desperdicio'),0))
    INTO totals FROM private.workforce_sheet_execution_entries
    WHERE servico_id=p_servico AND setor=p_setor AND tenant_id=sheet.tenant_id;
  RETURN jsonb_build_object('versao',sheet.versao,'totais',totals,'registros',entries);
END;
$$;
REVOKE ALL ON FUNCTION public.ficha_producao_consultar(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ficha_producao_consultar(uuid,text) TO authenticated;

CREATE FUNCTION public.ficha_producao_registrar(
  p_requisicao uuid,p_servico uuid,p_setor text,p_tipo text,p_quantidade numeric,
  p_unidade text,p_descricao text,p_versao integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE service public.servicos%ROWTYPE; sheet private.workforce_service_sheets%ROWTYPE;
  existing private.workforce_sheet_execution_entries%ROWTYPE; unit text; description text;
BEGIN
  PERFORM private.require_authorized_session();
  IF p_requisicao IS NULL OR p_setor NOT IN ('corte','montagem') OR p_tipo NOT IN ('produzido','defeito','desperdicio')
    OR p_quantidade IS NULL OR p_quantidade<=0 OR p_quantidade>=100000000 OR p_quantidade::text='NaN' THEN
    RAISE EXCEPTION 'Registro de produção inválido.' USING ERRCODE='22023';
  END IF;
  unit:=btrim(coalesce(p_unidade,'')); description:=btrim(coalesce(p_descricao,''));
  IF length(unit) NOT BETWEEN 1 AND 40 OR unit ~ '[[:cntrl:]]' OR length(description)>1000 OR description ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Unidade ou observação inválida.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO service FROM public.servicos WHERE id=p_servico FOR UPDATE;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor AND tenant_id=service.tenant_id FOR UPDATE;
  IF NOT FOUND OR NOT private.operational_permission(service.tenant_id,'ordens','editar',p_setor,sheet.responsavel_id=auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para registrar produção.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO existing FROM private.workforce_sheet_execution_entries WHERE tenant_id=service.tenant_id AND requisicao_id=p_requisicao;
  IF FOUND THEN
    IF existing.actor_id=auth.uid() AND existing.servico_id=p_servico AND existing.setor=p_setor AND existing.tipo=p_tipo
      AND existing.quantidade=p_quantidade AND existing.unidade=unit AND existing.descricao=description THEN
      RETURN public.ficha_producao_consultar(p_servico,p_setor)||jsonb_build_object('repetida',true);
    END IF;
    RAISE EXCEPTION 'Requisição já utilizada com dados diferentes.' USING ERRCODE='23505';
  END IF;
  IF p_versao IS DISTINCT FROM sheet.versao THEN RAISE EXCEPTION 'Ficha alterada. Recarregue.' USING ERRCODE='40001'; END IF;
  IF sheet.status='concluida' THEN RAISE EXCEPTION 'Ficha concluída não pode receber produção.' USING ERRCODE='55000'; END IF;
  INSERT INTO private.workforce_sheet_execution_entries(tenant_id,servico_id,setor,tipo,quantidade,unidade,descricao,requisicao_id,actor_id)
    VALUES(service.tenant_id,p_servico,p_setor,p_tipo,p_quantidade,unit,description,p_requisicao,auth.uid());
  UPDATE private.workforce_service_sheets SET versao=versao+1,atualizado_por=auth.uid(),atualizado_em=now()
    WHERE servico_id=p_servico AND setor=p_setor;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(service.tenant_id,auth.uid(),'producao_registrada','workforce_sheet_execution_entries',p_servico::text,
      jsonb_build_object('setor',p_setor,'tipo',p_tipo,'quantidade',p_quantidade,'unidade',unit,'versao',sheet.versao+1));
  RETURN public.ficha_producao_consultar(p_servico,p_setor)||jsonb_build_object('repetida',false);
END;
$$;
REVOKE ALL ON FUNCTION public.ficha_producao_registrar(uuid,uuid,text,text,numeric,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ficha_producao_registrar(uuid,uuid,text,text,numeric,text,text,integer) TO authenticated;

COMMIT;

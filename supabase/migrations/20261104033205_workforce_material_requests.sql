BEGIN;

CREATE TABLE private.workforce_material_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  servico_id uuid NOT NULL REFERENCES public.servicos(id),
  setor_solicitante text NOT NULL CHECK (setor_solicitante IN ('corte','montagem','acabamento','instalacao')),
  item_id uuid NOT NULL REFERENCES public.estoque_itens(id),
  quantidade numeric(14,3) NOT NULL CHECK (quantidade > 0 AND quantidade < 100000000 AND quantidade::text <> 'NaN'),
  unidade text NOT NULL CHECK (length(unidade) BETWEEN 1 AND 40 AND unidade !~ '[[:cntrl:]]'),
  motivo text NOT NULL CHECK (length(motivo) BETWEEN 3 AND 1000 AND motivo !~ '[[:cntrl:]]'),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','recusada','atendida','cancelada')),
  solicitante_id uuid NOT NULL REFERENCES auth.users(id),
  decidido_por uuid REFERENCES auth.users(id),
  decidido_em timestamptz,
  atendido_por uuid REFERENCES auth.users(id),
  atendido_em timestamptz,
  versao integer NOT NULL DEFAULT 1 CHECK (versao>0),
  requisicao_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,requisicao_id)
);
ALTER TABLE private.workforce_material_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.workforce_material_requests FROM PUBLIC,anon,authenticated;
CREATE INDEX workforce_material_requests_service ON private.workforce_material_requests(tenant_id,servico_id,setor_solicitante,status,criado_em DESC);
CREATE INDEX workforce_material_requests_item ON private.workforce_material_requests(tenant_id,item_id,status);

CREATE FUNCTION private.material_request_visible(p_request private.workforce_material_requests,p_sheet private.workforce_service_sheets) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_request.solicitante_id=auth.uid()
    OR private.operational_permission(p_request.tenant_id,'estoque','visualizar','estoque',false)
    OR private.sheet_assigned_read(p_sheet);
$$;
REVOKE ALL ON FUNCTION private.material_request_visible(private.workforce_material_requests,private.workforce_service_sheets) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.material_solicitacao_materiais(p_servico uuid,p_setor text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; sheet private.workforce_service_sheets%ROWTYPE; result jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT tenant_id INTO company FROM public.servicos WHERE id=p_servico;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor AND tenant_id=company;
  IF company IS NULL OR NOT FOUND OR p_setor NOT IN ('corte','montagem','acabamento','instalacao')
    OR NOT private.operational_permission(company,'estoque','criar',p_setor,private.sheet_assigned_read(sheet)) THEN
    RAISE EXCEPTION 'Materiais indisponíveis para este setor.' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'nome',i.nome,'unidade',i.unidade,'saldo',i.saldo) ORDER BY i.nome,i.id),'[]') INTO result
    FROM public.estoque_itens i WHERE i.tenant_id=company AND i.ativo;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.material_solicitacao_materiais(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.material_solicitacao_materiais(uuid,text) TO authenticated;

CREATE FUNCTION public.material_solicitacao_listar(p_servico uuid,p_setor text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE service public.servicos%ROWTYPE; sheet private.workforce_service_sheets%ROWTYPE; result jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO service FROM public.servicos WHERE id=p_servico;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor AND tenant_id=service.tenant_id;
  IF NOT FOUND OR p_setor NOT IN ('corte','montagem','acabamento','instalacao') THEN
    RAISE EXCEPTION 'Solicitações indisponíveis.' USING ERRCODE='42501';
  END IF;
  IF NOT private.sheet_assigned_read(sheet) AND NOT private.operational_permission(service.tenant_id,'estoque','visualizar','estoque',false) THEN
    RAISE EXCEPTION 'Solicitações indisponíveis.' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.criado_em DESC,x.id),'[]') INTO result
    FROM (SELECT r.id,r.servico_id,r.setor_solicitante,r.item_id,i.nome AS item_nome,r.quantidade,r.unidade,r.motivo,r.status,r.versao,r.criado_em,r.decidido_em,r.atendido_em
      FROM private.workforce_material_requests r JOIN public.estoque_itens i ON i.id=r.item_id AND i.tenant_id=r.tenant_id
      WHERE r.tenant_id=service.tenant_id AND r.servico_id=p_servico AND r.setor_solicitante=p_setor
        AND private.material_request_visible(r,sheet)
      ORDER BY r.criado_em DESC,r.id LIMIT 100) x;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.material_solicitacao_listar(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.material_solicitacao_listar(uuid,text) TO authenticated;

CREATE FUNCTION public.material_solicitacao_criar(
  p_requisicao uuid,p_servico uuid,p_setor text,p_item_id uuid,p_quantidade numeric,p_unidade text,p_motivo text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE service public.servicos%ROWTYPE; sheet private.workforce_service_sheets%ROWTYPE; item public.estoque_itens%ROWTYPE;
  existing private.workforce_material_requests%ROWTYPE; unit text; reason text; request_id uuid;
BEGIN
  PERFORM private.require_authorized_session();
  IF p_requisicao IS NULL OR p_setor NOT IN ('corte','montagem','acabamento','instalacao') OR p_quantidade IS NULL OR p_quantidade<=0 OR p_quantidade>=100000000 OR p_quantidade::text='NaN' THEN
    RAISE EXCEPTION 'Solicitação de material inválida.' USING ERRCODE='22023';
  END IF;
  unit:=btrim(coalesce(p_unidade,'')); reason:=btrim(coalesce(p_motivo,''));
  IF length(unit) NOT BETWEEN 1 AND 40 OR unit ~ '[[:cntrl:]]' OR length(reason) NOT BETWEEN 3 AND 1000 OR reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Unidade ou motivo inválido.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO service FROM public.servicos WHERE id=p_servico FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Serviço indisponível.' USING ERRCODE='42501'; END IF;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor AND tenant_id=service.tenant_id FOR SHARE;
  IF NOT FOUND OR NOT private.operational_permission(service.tenant_id,'estoque','criar',p_setor,private.sheet_assigned_read(sheet)) THEN
    RAISE EXCEPTION 'Sem permissão para solicitar materiais.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO item FROM public.estoque_itens WHERE id=p_item_id AND tenant_id=service.tenant_id AND ativo FOR SHARE;
  IF NOT FOUND OR item.unidade<>unit THEN RAISE EXCEPTION 'Material indisponível ou unidade incompatível.' USING ERRCODE='42514'; END IF;
  SELECT * INTO existing FROM private.workforce_material_requests WHERE tenant_id=service.tenant_id AND requisicao_id=p_requisicao;
  IF FOUND THEN
    IF existing.solicitante_id=auth.uid() AND existing.servico_id=p_servico AND existing.setor_solicitante=p_setor AND existing.item_id=p_item_id
      AND existing.quantidade=p_quantidade AND existing.unidade=unit AND existing.motivo=reason THEN
      RETURN jsonb_build_object('id',existing.id,'status',existing.status,'versao',existing.versao,'repetida',true);
    END IF;
    RAISE EXCEPTION 'Requisição já utilizada com dados diferentes.' USING ERRCODE='23505';
  END IF;
  INSERT INTO private.workforce_material_requests(tenant_id,servico_id,setor_solicitante,item_id,quantidade,unidade,motivo,solicitante_id,requisicao_id)
    VALUES(service.tenant_id,p_servico,p_setor,p_item_id,p_quantidade,unit,reason,auth.uid(),p_requisicao) RETURNING id INTO request_id;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(service.tenant_id,auth.uid(),'material_solicitado','workforce_material_requests',request_id::text,
      jsonb_build_object('servico_id',p_servico,'setor',p_setor,'item_id',p_item_id,'quantidade',p_quantidade,'unidade',unit));
  RETURN jsonb_build_object('id',request_id,'status','pendente','versao',1,'repetida',false);
END;
$$;
REVOKE ALL ON FUNCTION public.material_solicitacao_criar(uuid,uuid,text,uuid,numeric,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.material_solicitacao_criar(uuid,uuid,text,uuid,numeric,text,text) TO authenticated;

CREATE FUNCTION public.material_solicitacao_atualizar(p_id uuid,p_acao text,p_versao integer,p_motivo text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE request private.workforce_material_requests%ROWTYPE; service public.servicos%ROWTYPE; sheet private.workforce_service_sheets%ROWTYPE;
  item public.estoque_itens%ROWTYPE; reserved numeric; reason text; next_status text;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO request FROM private.workforce_material_requests WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação indisponível.' USING ERRCODE='42501'; END IF;
  SELECT * INTO service FROM public.servicos WHERE id=request.servico_id;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=request.servico_id AND setor=request.setor_solicitante AND tenant_id=request.tenant_id;
  IF NOT FOUND OR request.tenant_id<>private.current_tenant_id() THEN RAISE EXCEPTION 'Solicitação indisponível.' USING ERRCODE='42501'; END IF;
  reason:=btrim(coalesce(p_motivo,''));
  IF p_versao IS DISTINCT FROM request.versao THEN RAISE EXCEPTION 'Solicitação alterada. Recarregue.' USING ERRCODE='40001'; END IF;
  IF p_acao IN ('aprovar','recusar') THEN
    IF NOT private.operational_permission(request.tenant_id,'estoque','aprovar','estoque',false) OR request.status<>'pendente' THEN
      RAISE EXCEPTION 'Solicitação indisponível para decisão.' USING ERRCODE='42501';
    END IF;
    IF p_acao='recusar' AND length(reason) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'Informe o motivo da recusa.' USING ERRCODE='22023'; END IF;
    IF p_acao='aprovar' THEN
      SELECT * INTO item FROM public.estoque_itens WHERE id=request.item_id AND tenant_id=request.tenant_id AND ativo FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Material indisponível.' USING ERRCODE='23514'; END IF;
      SELECT coalesce(sum(quantidade),0) INTO reserved FROM private.workforce_material_requests WHERE tenant_id=request.tenant_id AND item_id=request.item_id AND status='aprovada';
      IF item.saldo-reserved<request.quantidade THEN RAISE EXCEPTION 'Saldo insuficiente para reservar este material.' USING ERRCODE='23514'; END IF;
      next_status:='aprovada';
    ELSE next_status:='recusada'; END IF;
    UPDATE private.workforce_material_requests SET status=next_status,decidido_por=auth.uid(),decidido_em=now(),versao=versao+1,atualizado_em=now()
      WHERE id=p_id;
  ELSIF p_acao='atender' THEN
    IF NOT private.operational_permission(request.tenant_id,'estoque','registrar_saida','estoque',false) OR request.status<>'aprovada' THEN
      RAISE EXCEPTION 'Solicitação indisponível para atendimento.' USING ERRCODE='42501';
    END IF;
    PERFORM public.estoque_registrar_movimento(request.item_id,'saida',request.quantidade,'Solicitação de material '||request.id,NULL);
    UPDATE private.workforce_material_requests SET status='atendida',atendido_por=auth.uid(),atendido_em=now(),versao=versao+1,atualizado_em=now()
      WHERE id=p_id;
  ELSIF p_acao='cancelar' THEN
    IF request.solicitante_id<>auth.uid() OR request.status NOT IN ('pendente','aprovada') OR NOT private.sheet_assigned_read(sheet) THEN
      RAISE EXCEPTION 'Solicitação não pode ser cancelada.' USING ERRCODE='42501';
    END IF;
    UPDATE private.workforce_material_requests SET status='cancelada',versao=versao+1,atualizado_em=now() WHERE id=p_id;
  ELSE RAISE EXCEPTION 'Ação inválida.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(request.tenant_id,auth.uid(),'material_solicitacao_'||p_acao,'workforce_material_requests',p_id::text,
      jsonb_build_object('antes',request.status,'depois',CASE WHEN p_acao='aprovar' THEN 'aprovada' WHEN p_acao='recusar' THEN 'recusada' WHEN p_acao='atender' THEN 'atendida' ELSE 'cancelada' END,'versao',request.versao+1,'motivo',NULLIF(reason,'')));
  RETURN jsonb_build_object('id',p_id,'status',CASE WHEN p_acao='aprovar' THEN 'aprovada' WHEN p_acao='recusar' THEN 'recusada' WHEN p_acao='atender' THEN 'atendida' ELSE 'cancelada' END,'versao',request.versao+1);
END;
$$;
REVOKE ALL ON FUNCTION public.material_solicitacao_atualizar(uuid,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.material_solicitacao_atualizar(uuid,text,integer,text) TO authenticated;

COMMIT;

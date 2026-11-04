CREATE FUNCTION public.material_solicitacao_painel_estoque(p_status text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; result jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  company:=private.current_tenant_id();
  IF p_status IS NOT NULL AND p_status NOT IN ('pendente','aprovada','recusada','atendida','cancelada') THEN
    RAISE EXCEPTION 'Status de solicitação inválido.' USING ERRCODE='22023';
  END IF;
  IF NOT private.operational_permission(company,'estoque','visualizar','estoque',false) THEN
    RAISE EXCEPTION 'Sem permissão para consultar solicitações do estoque.' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.criado_em DESC,x.id),'[]') INTO result
    FROM (
      SELECT r.id,r.servico_id,s.nome AS servico_nome,r.setor_solicitante,r.item_id,i.nome AS item_nome,
        r.quantidade,r.unidade,r.motivo,r.status,r.versao,r.criado_em,r.decidido_em,r.atendido_em,
        p.nome_completo AS solicitante_nome
      FROM private.workforce_material_requests r
      JOIN public.servicos s ON s.id=r.servico_id AND s.tenant_id=r.tenant_id
      JOIN public.estoque_itens i ON i.id=r.item_id AND i.tenant_id=r.tenant_id
      JOIN public.profiles p ON p.id=r.solicitante_id AND p.tenant_id=r.tenant_id
      WHERE r.tenant_id=company AND (p_status IS NULL OR r.status=p_status)
      LIMIT 200
    ) x;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.material_solicitacao_painel_estoque(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.material_solicitacao_painel_estoque(text) TO authenticated;

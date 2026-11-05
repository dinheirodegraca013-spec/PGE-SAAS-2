CREATE OR REPLACE FUNCTION public.assinar_orcamento_publico(
  p_token uuid,
  p_nome text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_row public.orcamentos%ROWTYPE;
  service_status text;
BEGIN
  IF p_nome IS NULL OR length(btrim(p_nome)) < 3 OR length(btrim(p_nome)) > 160 THEN
    RAISE EXCEPTION 'invalid_signer_name' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO quote_row
    FROM public.orcamentos
   WHERE public_token = p_token
   FOR UPDATE;

  IF NOT FOUND
     OR (quote_row.data_validade IS NOT NULL AND quote_row.data_validade < now())
     OR lower(quote_row.status) NOT IN ('pendente', 'enviado', 'visualizado', 'assinado') THEN
    RAISE EXCEPTION 'quote_unavailable' USING ERRCODE = 'P0002';
  END IF;

  IF lower(quote_row.status) = 'assinado' OR quote_row.tem_pdf_assinado THEN
    RETURN jsonb_build_object(
      'itens', quote_row.itens,
      'valor_total', COALESCE(quote_row.valor_total, 0),
      'data_validade', quote_row.data_validade,
      'observacoes_gerais', quote_row.observacoes_gerais,
      'status', quote_row.status,
      'tem_pdf_assinado', quote_row.tem_pdf_assinado,
      'assinado_por_nome', quote_row.assinado_por_nome,
      'assinado_em', quote_row.assinado_em
    );
  END IF;

  IF quote_row.servico_id IS NOT NULL THEN
    SELECT status INTO service_status
      FROM public.servicos
     WHERE id = quote_row.servico_id
       AND tenant_id = quote_row.tenant_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'linked_service_not_found' USING ERRCODE = 'P0003';
    END IF;
  END IF;

  UPDATE public.orcamentos
     SET status = 'Assinado',
         tem_pdf_assinado = true,
         assinado_por_nome = btrim(p_nome),
         assinado_em = now(),
         updated_at = now()
   WHERE id = quote_row.id;

  IF quote_row.servico_id IS NOT NULL THEN
    UPDATE public.servicos
       SET status = 'Aprovado', updated_at = now()
     WHERE id = quote_row.servico_id
       AND tenant_id = quote_row.tenant_id;
  END IF;

  INSERT INTO public.audit_logs(tenant_id, actor_id, acao, tabela, registro_id, detalhes)
  VALUES (
    quote_row.tenant_id, NULL, 'ASSINAR_PUBLICO', 'orcamentos', quote_row.id::text,
    jsonb_build_object('nome', btrim(p_nome), 'canal', 'link_publico')
  );

  RETURN jsonb_build_object(
    'itens', quote_row.itens,
    'valor_total', COALESCE(quote_row.valor_total, 0),
    'data_validade', quote_row.data_validade,
    'observacoes_gerais', quote_row.observacoes_gerais,
    'status', 'Assinado',
    'tem_pdf_assinado', true,
    'assinado_por_nome', btrim(p_nome),
    'assinado_em', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assinar_orcamento_publico(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assinar_orcamento_publico(uuid, text) TO service_role;


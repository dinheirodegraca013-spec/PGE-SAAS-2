BEGIN;
CREATE FUNCTION public.minhas_atividades(p_pagina integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; result jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT tenant_id INTO company FROM public.profiles WHERE id=auth.uid() AND ativo;
  IF company IS NULL THEN RAISE EXCEPTION 'Conta indisponível.' USING ERRCODE='42501'; END IF;
  IF p_pagina IS NULL OR p_pagina<0 OR p_pagina>100000 THEN RAISE EXCEPTION 'Página inválida.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(page)),'[]') INTO result FROM (
    SELECT a.id,a.acao,a.tabela,a.registro_id,a.created_at,
      CASE WHEN a.detalhes->>'setor' IN ('corte','montagem','acabamento','instalacao','estoque','financeiro') THEN a.detalhes->>'setor' END AS setor
    FROM public.audit_logs a WHERE a.tenant_id=company AND a.actor_id=auth.uid()
      AND private.operational_permission(company,'atividades','visualizar',
        CASE WHEN a.detalhes->>'setor' IN ('corte','montagem','acabamento','instalacao','estoque','financeiro') THEN a.detalhes->>'setor' END,true)
    ORDER BY a.created_at DESC,a.id DESC LIMIT 21 OFFSET p_pagina*20
  ) page;
  RETURN jsonb_build_object('itens',CASE WHEN jsonb_array_length(result)>20 THEN result-20 ELSE result END,'tem_mais',jsonb_array_length(result)>20);
END;
$$;
REVOKE ALL ON FUNCTION public.minhas_atividades(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.minhas_atividades(integer) TO authenticated;
COMMIT;

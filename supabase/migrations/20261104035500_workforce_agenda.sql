CREATE FUNCTION public.minha_agenda(p_inicio date DEFAULT current_date,p_fim date DEFAULT (current_date+30)) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; result jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  company:=private.current_tenant_id();
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim<p_inicio OR p_fim-p_inicio>365 THEN
    RAISE EXCEPTION 'Período da agenda inválido.' USING ERRCODE='22023';
  END IF;
  IF NOT private.operational_permission(company,'agenda','visualizar',NULL,true) THEN
    RAISE EXCEPTION 'Sem permissão para consultar a agenda.' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.inicio,x.id),'[]') INTO result
    FROM (
      SELECT t.id,t.servico_id,t.setor,'tarefa' AS tipo,t.titulo,t.descricao,t.status,t.prioridade,
        t.prazo AS inicio,t.obrigatoria,t.progresso
      FROM private.workforce_tasks t
      WHERE t.tenant_id=company AND t.responsavel_id=auth.uid()
        AND t.prazo IS NOT NULL AND t.prazo::date BETWEEN p_inicio AND p_fim
        AND t.status NOT IN ('concluida','cancelada')
      LIMIT 200
    ) x;
  RETURN jsonb_build_object('inicio',p_inicio,'fim',p_fim,'itens',result);
END;
$$;
REVOKE ALL ON FUNCTION public.minha_agenda(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.minha_agenda(date,date) TO authenticated;

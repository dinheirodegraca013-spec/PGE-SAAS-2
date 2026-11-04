BEGIN;
CREATE FUNCTION public.meu_resumo_operacional() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tasks jsonb; active_orders bigint; upcoming jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT jsonb_build_object('total',count(*),'pendentes',count(*) FILTER(WHERE status='pendente'),
    'em_andamento',count(*) FILTER(WHERE status='em_andamento'),'concluidas',count(*) FILTER(WHERE status='concluida'),
    'atrasadas',count(*) FILTER(WHERE prazo<now() AND status NOT IN ('concluida','cancelada')),
    'aguardando_material',count(*) FILTER(WHERE status='aguardando_material'),
    'aguardando_aprovacao',count(*) FILTER(WHERE status='aguardando_aprovacao')) INTO tasks
    FROM private.workforce_tasks t WHERE t.responsavel_id=auth.uid()
      AND private.operational_permission(t.tenant_id,'tarefas','visualizar',t.setor,true);
  SELECT count(DISTINCT s.servico_id) INTO active_orders FROM private.workforce_service_sheets s
    WHERE s.responsavel_id=auth.uid() AND s.status='em_andamento'
      AND private.operational_permission(s.tenant_id,'ordens','visualizar',s.setor,true);
  SELECT coalesce(jsonb_agg(to_jsonb(items)),'[]') INTO upcoming FROM(
    SELECT t.id,t.titulo,t.setor,t.prazo FROM private.workforce_tasks t WHERE t.responsavel_id=auth.uid()
      AND t.status NOT IN ('concluida','cancelada') AND t.prazo IS NOT NULL
      AND private.operational_permission(t.tenant_id,'tarefas','visualizar',t.setor,true)
      ORDER BY t.prazo,t.id LIMIT 5
  ) items;
  RETURN jsonb_build_object('tarefas',tasks,'ordens_em_execucao',active_orders,'proximos_prazos',upcoming);
END;
$$;
REVOKE ALL ON FUNCTION public.meu_resumo_operacional() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.meu_resumo_operacional() TO authenticated;
COMMIT;

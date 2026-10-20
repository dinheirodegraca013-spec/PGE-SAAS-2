-- Executada em produção em 2026-10-20. Idempotente.
-- Escritas devem passar exclusivamente pelas RPCs autorizadas, com verificação de tenant e papel.
REVOKE ALL PRIVILEGES ON TABLE
  public.estoque_itens,
  public.estoque_movimentacoes,
  public.financeiro_lancamentos,
  public.financeiro_baixas
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.estoque_itens,
  public.estoque_movimentacoes,
  public.financeiro_lancamentos,
  public.financeiro_baixas
TO authenticated;

-- As políticas RLS SELECT de cada tabela continuam obrigatórias.

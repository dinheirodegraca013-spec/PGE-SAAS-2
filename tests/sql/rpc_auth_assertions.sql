\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='20000000-0000-0000-0000-000000000001';
DO $test$
DECLARE item uuid; lanc uuid; balance numeric; v_status text;
BEGIN
 item:=public.estoque_cadastrar_item('Teste','SKU1','un',0);
 PERFORM public.estoque_registrar_movimento(item,'entrada',10,'entrada',NULL);
 PERFORM public.estoque_registrar_movimento(item,'saida',3,'saida',NULL);
 SELECT saldo INTO balance FROM public.estoque_itens WHERE id=item;
 IF balance<>7 THEN RAISE EXCEPTION 'Saldo esperado 7, obtido %',balance; END IF;
 BEGIN
  PERFORM public.estoque_registrar_movimento(item,'saida',8,'saldo negativo',NULL);
  RAISE EXCEPTION 'Saldo negativo aceito';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 lanc:=public.financeiro_criar_lancamento('receita','Receita teste',100,'2026-10-20',NULL);
 PERFORM public.financeiro_registrar_baixa(lanc,40,'2026-10-20',NULL,NULL);
 SELECT status INTO v_status FROM public.financeiro_lancamentos WHERE id=lanc;
 IF v_status<>'parcial' THEN RAISE EXCEPTION 'Status parcial esperado'; END IF;
 BEGIN
  PERFORM public.financeiro_registrar_baixa(lanc,61,'2026-10-20',NULL,NULL);
  RAISE EXCEPTION 'Pagamento acima do devido aceito';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 PERFORM public.financeiro_registrar_baixa(lanc,60,'2026-10-20',NULL,NULL);
 SELECT status INTO v_status FROM public.financeiro_lancamentos WHERE id=lanc;
 IF v_status<>'quitado' THEN RAISE EXCEPTION 'Quitacao esperada'; END IF;
END $test$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='20000000-0000-0000-0000-000000000003';
DO $test$
BEGIN
 BEGIN
  PERFORM public.estoque_cadastrar_item('Negado',NULL,'un',0);
  RAISE EXCEPTION 'Usuario sem papel criou item';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.financeiro_criar_lancamento('despesa','Negado',10,'2026-10-20',NULL);
  RAISE EXCEPTION 'Usuario sem papel criou lancamento';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $test$;
ROLLBACK;
SELECT 'RPC auth tests OK' AS result;

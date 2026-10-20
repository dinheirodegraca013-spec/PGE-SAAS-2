-- Execute SOMENTE em PostgreSQL local descartável, após migrações de estoque.
-- psql -v ON_ERROR_STOP=1 -f tests/estoque-integration.sql
-- A transação inteira é revertida: nenhum dado de teste é persistido.
BEGIN;
DO $$
DECLARE
 t1 uuid := gen_random_uuid();
 t2 uuid := gen_random_uuid();
 i1 uuid := gen_random_uuid();
 i2 uuid := gen_random_uuid();
 saldo_atual numeric;
BEGIN
 INSERT INTO public.tenants (id,razao_social) VALUES
 (t1,'Teste Estoque A'),(t2,'Teste Estoque B');
 INSERT INTO public.estoque_itens (id,tenant_id,nome,saldo)
 VALUES (i1,t1,'Parafuso',10),(i2,t2,'Parafuso',5);
 -- A atualização com predicado de tenant e saldo deve recusar
 -- tentativa de saída acima do saldo disponível.
 UPDATE public.estoque_itens SET saldo = saldo - 11
 WHERE id = i1 AND tenant_id = t1 AND saldo >= 11;
 IF FOUND THEN RAISE EXCEPTION 'Saída indevida aceita'; END IF;
 -- Um item da outra empresa nunca pode ser atualizado pelo tenant A.
 UPDATE public.estoque_itens SET saldo = saldo + 1
 WHERE id = i2 AND tenant_id = t1;
 IF FOUND THEN RAISE EXCEPTION 'Isolamento de tenant falhou'; END IF;
 UPDATE public.estoque_itens SET saldo = saldo - 3
 WHERE id = i1 AND tenant_id = t1 AND saldo >= 3;
 IF NOT FOUND THEN RAISE EXCEPTION 'Saída válida rejeitada'; END IF;
 SELECT saldo INTO saldo_atual FROM public.estoque_itens WHERE id=i1;
 IF saldo_atual <> 7 THEN RAISE EXCEPTION 'Saldo incorreto: %',saldo_atual; END IF;
 -- A restrição de saldo negativo deve impedir escrita mesmo fora da RPC.
 BEGIN
  UPDATE public.estoque_itens SET saldo = -1 WHERE id=i1;
  RAISE EXCEPTION 'CHECK de saldo negativo não funcionou';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 RAISE NOTICE 'Testes locais de saldo e tenant concluídos';
END $$;
ROLLBACK;

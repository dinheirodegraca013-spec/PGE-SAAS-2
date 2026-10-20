-- Simulated authenticated sessions in disposable PostgreSQL only.
-- These are role/JWT fixtures, NOT a substitute for production auth.
BEGIN;
DO $$
DECLARE
 t1 uuid := gen_random_uuid(); t2 uuid := gen_random_uuid();
 u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
 item1 uuid := gen_random_uuid(); item2 uuid := gen_random_uuid();
 got uuid; balance numeric; movements integer;
BEGIN
 INSERT INTO public.tenants(id,razao_social) VALUES(t1,'Empresa A'),(t2,'Empresa B');
 INSERT INTO auth.users(id) VALUES(u1),(u2);
 INSERT INTO public.profiles(id,tenant_id,papel,ativo)
 VALUES(u1,t1,'Estoque',true),(u2,t2,'Estoque',true);
 INSERT INTO public.estoque_itens(id,tenant_id,nome,saldo)
 VALUES(item1,t1,'Material A',10),(item2,t2,'Material B',9);

 PERFORM set_config('request.jwt.claim.sub',u1::text,true);
 PERFORM set_config('request.jwt.claim.tenant_id',t1::text,true);
 -- SET ROLE is transaction-local, but cannot be called inside SECURITY DEFINER.
 -- Here it simulates PostgREST's authenticated DB role.
 EXECUTE 'SET LOCAL ROLE authenticated';
 SELECT public.estoque_registrar_movimento(item1,'saida',3,'Teste local',NULL) INTO got;
 IF got IS NULL THEN RAISE EXCEPTION 'RPC nao retornou ID'; END IF;
 SELECT saldo INTO balance FROM public.estoque_itens WHERE id=item1;
 IF balance <> 7 THEN RAISE EXCEPTION 'Saldo esperado 7, obtido %',balance; END IF;
 BEGIN
  PERFORM public.estoque_registrar_movimento(item1,'saida',8,'Saldo insuficiente',NULL);
  RAISE EXCEPTION 'Saida acima do saldo foi aceita';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  PERFORM public.estoque_registrar_movimento(item2,'saida',1,'Outra empresa',NULL);
  RAISE EXCEPTION 'RPC cruzou tenant';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  PERFORM public.estoque_registrar_movimento(item1,'saida',0,'Zero',NULL);
  RAISE EXCEPTION 'Quantidade zero aceita';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 SELECT count(*) INTO movements FROM public.estoque_movimentacoes WHERE item_id=item1;
 IF movements <> 1 THEN RAISE EXCEPTION 'Movimentacoes esperadas 1, obtidas %',movements; END IF;
 EXECUTE 'RESET ROLE';
 RAISE NOTICE 'RPC tenant/saldo: testes autenticados passaram';
END $$;
ROLLBACK;

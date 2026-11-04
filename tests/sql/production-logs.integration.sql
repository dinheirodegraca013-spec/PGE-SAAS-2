DO $$
DECLARE owner_id uuid:=gen_random_uuid();company uuid;service uuid:=gen_random_uuid();request_id uuid:=gen_random_uuid();result jsonb;checks jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);PERFORM set_config('request.jwt.claim.role','service_role',true);PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(owner_id,'production-'||owner_id||'@example.test','{"nome_completo":"Production owner","razao_social":"Production fixture"}');
  SELECT tenant_id INTO company FROM public.profiles WHERE id=owner_id;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);PERFORM set_config('request.jwt.claim.role','authenticated',true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',gen_random_uuid())::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Production fixture');
  INSERT INTO public.servicos(id,tenant_id,nome,created_by) VALUES(service,company,'Production service',owner_id);
  PERFORM public.ficha_servico_salvar(service,'corte','{}',0);
  PERFORM public.ficha_execucao_atualizar(service,'corte','iniciar',1);
  result:=public.ficha_producao_registrar(request_id,service,'corte','produzido',4,'un','Lote A',2);
  IF (result->'totais'->>'produzido')::numeric<>4 OR jsonb_array_length(result->'registros')<>1 OR (result->>'versao')::integer<>3 THEN RAISE EXCEPTION 'Registro de produção não consolidado'; END IF;
  result:=public.ficha_producao_registrar(request_id,service,'corte','produzido',4,'un','Lote A',2);
  IF result->>'repetida'<>'true' OR (result->>'versao')::integer<>3 THEN RAISE EXCEPTION 'Repetição idempotente inválida'; END IF;
  BEGIN PERFORM public.ficha_producao_registrar(request_id,service,'corte','defeito',1,'un','Outro',3);RAISE EXCEPTION 'Requisição duplicada aceitou dados diferentes';EXCEPTION WHEN unique_violation THEN NULL;END;
  BEGIN PERFORM public.ficha_producao_registrar(gen_random_uuid(),service,'corte','defeito',0,'un','',3);RAISE EXCEPTION 'Quantidade zero aceita';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
  BEGIN PERFORM public.ficha_producao_registrar(gen_random_uuid(),service,'corte','defeito',1,'un','',2);RAISE EXCEPTION 'Versão antiga aceita';EXCEPTION WHEN serialization_failure THEN NULL;END;
END;
$$;
SELECT 'PASS: produção, defeito e desperdício com versão e idempotência' AS result;

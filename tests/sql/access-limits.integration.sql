-- Run after the access-limits migration, inside a BEGIN/ROLLBACK transaction.
-- All accounts below exist only inside this transaction; no e-mails are sent.
DO $$
DECLARE owner_id uuid:=gen_random_uuid(); employee_id uuid:=gen_random_uuid(); extra_id uuid:=gen_random_uuid();
  company uuid; sid uuid:=gen_random_uuid(); device1 uuid:=gen_random_uuid(); device2 uuid:=gen_random_uuid();
  registered uuid; result jsonb; blocked boolean:=false; claims jsonb;
  outsider uuid:=gen_random_uuid(); outsider_device uuid; worker_claims jsonb;
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(owner_id,'limits-'||owner_id||'@example.test','{"nome_completo":"Limits fixture","razao_social":"Access limits fixture"}');
  SELECT tenant_id INTO company FROM public.profiles WHERE id=owner_id;
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(outsider,'outside-'||outsider||'@example.test','{"nome_completo":"Other company owner","razao_social":"Other company fixture"}');
  INSERT INTO private.login_devices(user_id,device_key,label) VALUES(outsider,gen_random_uuid(),'Other company browser') RETURNING id INTO outsider_device;
  IF (SELECT principal_usuario_id FROM public.tenants WHERE id=company) IS DISTINCT FROM owner_id THEN RAISE EXCEPTION 'Principal account was not assigned'; END IF;
  INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES(employee_id,'limits-'||employee_id||'@example.test',jsonb_build_object('gestio_employee',true,'gestio_criado_por',owner_id,'gestio_tenant_id',company,'gestio_setor','corte'),'{"nome_completo":"Employee one"}');
  INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES(extra_id,'limits-'||extra_id||'@example.test',jsonb_build_object('gestio_employee',true,'gestio_criado_por',owner_id,'gestio_tenant_id',company,'gestio_setor','montagem'),'{"nome_completo":"Employee two"}');
  BEGIN
    INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES(gen_random_uuid(),'over-quota@example.test',jsonb_build_object('gestio_employee',true,'gestio_criado_por',owner_id,'gestio_tenant_id',company,'gestio_setor','corte'),'{"nome_completo":"Over quota"}');
  EXCEPTION WHEN SQLSTATE 'P0001' THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Basic plan allowed a third employee'; END IF;
  claims:=jsonb_build_object('sub',owner_id,'role','authenticated','session_id',sid);
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',claims::text,true);
  result:=public.autorizar_dispositivo(device1,'Fixture first browser');
  registered:=(result->>'device_id')::uuid;
  UPDATE private.access_settings SET devices_enabled=true WHERE id;
  IF NOT private.device_session_allowed() THEN RAISE EXCEPTION 'Registered owner was denied'; END IF;
  blocked:=false;
  BEGIN PERFORM public.listar_dispositivos(outsider); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Devices leaked across tenants'; END IF;
  blocked:=false;
  BEGIN PERFORM public.revogar_dispositivo(outsider_device); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Device revoked across tenants'; END IF;
  IF has_function_privilege('anon','public.autorizar_dispositivo(uuid,text)','execute') OR has_table_privilege('authenticated','private.login_devices','SELECT') THEN RAISE EXCEPTION 'Private device data exposed'; END IF;
  result:=public.limites_acesso();
  IF (result->>'sublogins_active')::int<>2 OR (result->>'sublogins_available')::int<>0 THEN RAISE EXCEPTION 'Owner counted as employee'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_set(claims,'{session_id}',to_jsonb(gen_random_uuid()::text))::text,true);
  blocked:=false;
  BEGIN PERFORM public.autorizar_dispositivo(device2,'Fixture second browser'); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Device quota bypassed'; END IF;
  -- Only the trusted billing service changes plan. JWT is restored afterwards.
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  UPDATE public.tenants SET plano='profissional' WHERE id=company;
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM public.autorizar_dispositivo(device2,'Fixture second browser');
  IF NOT private.device_session_allowed() THEN RAISE EXCEPTION 'Upgrade did not release device'; END IF;
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  UPDATE public.tenants SET plano='básico' WHERE id=company;
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  IF private.device_session_allowed() THEN RAISE EXCEPTION 'Downgrade did not suspend newer device'; END IF;
  PERFORM set_config('request.jwt.claims',claims::text,true);
  IF NOT private.device_session_allowed() THEN RAISE EXCEPTION 'Downgrade suspended oldest device'; END IF;
  PERFORM public.revogar_dispositivo(registered);
  IF private.device_session_allowed() THEN RAISE EXCEPTION 'Revoked session still authorized'; END IF;
  -- A blocked login may revoke its own old device, but not another user's device.
  IF (public.listar_dispositivos()->>'limit')::int<>1 THEN RAISE EXCEPTION 'Blocked self-service failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM private.access_audit WHERE tenant_id=company AND action='device_revoked') THEN RAISE EXCEPTION 'Revocation was not audited'; END IF;
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  UPDATE public.tenants SET plano='profissional' WHERE id=company;
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM public.autorizar_dispositivo(device2,'Fixture second browser');
  PERFORM public.gerenciar_funcionario(employee_id,'Edited employee','acabamento',false);
  IF private.user_within_plan(employee_id) THEN RAISE EXCEPTION 'Inactive employee still authorized'; END IF;
  PERFORM public.gerenciar_funcionario(employee_id,'Edited employee','acabamento',true);
  IF NOT private.user_within_plan(employee_id) THEN RAISE EXCEPTION 'Employee activation failed'; END IF;
  worker_claims:=jsonb_build_object('sub',employee_id,'role','authenticated','session_id',gen_random_uuid());
  PERFORM set_config('request.jwt.claim.sub',employee_id::text,true);
  PERFORM set_config('request.jwt.claims',worker_claims::text,true);
  PERFORM public.autorizar_dispositivo(gen_random_uuid(),'Employee browser');
  blocked:=false;
  BEGIN PERFORM public.gerenciar_funcionario(extra_id,'Unauthorized change','financeiro',true); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Employee managed another account'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM set_config('request.jwt.claims',claims::text,true);
  -- Insert one more in Professional then downgrade: newest account is suspended.
  INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES(gen_random_uuid(),'third-'||company||'@example.test',jsonb_build_object('gestio_employee',true,'gestio_criado_por',owner_id,'gestio_tenant_id',company,'gestio_setor','estoque'),'{"nome_completo":"Employee three"}');
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  UPDATE public.tenants SET plano='básico' WHERE id=company;
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  IF (public.limites_acesso()->>'sublogins_suspended')::int<>1 THEN RAISE EXCEPTION 'Employee downgrade suspension failed'; END IF;
  IF NOT private.user_within_plan(owner_id) THEN RAISE EXCEPTION 'Owner was suspended by employee quota'; END IF;
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  INSERT INTO public.saas_usuarios_internos(user_id,email,nome,papel,ativo)
    VALUES(owner_id,'limits-'||owner_id||'@example.test','Fixture super admin','SuperAdmin',true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM public.admin_ativar_plano_empresa(company,(SELECT id FROM public.saas_planos WHERE nome='Premium/Plus' LIMIT 1));
  result:=public.limites_acesso();
  IF (result->>'sublogin_limit')::int<>15 OR (result->>'device_limit')::int<>3 OR (result->>'sublogins_suspended')::int<>0 THEN RAISE EXCEPTION 'Premium limits or restoration failed'; END IF;
  PERFORM set_config('test.access.owner',owner_id::text,true);
  PERFORM set_config('test.access.company',company::text,true);
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_set(claims,'{session_id}',to_jsonb(gen_random_uuid()::text))::text,true);
END $$;

SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.profiles WHERE tenant_id=current_setting('test.access.company')::uuid) THEN
    RAISE EXCEPTION 'Unregistered session bypassed RLS';
  END IF;
  BEGIN
    PERFORM public.estoque_cadastrar_item('Blocked fixture','BLOCKED','un',1);
    RAISE EXCEPTION 'Unregistered session bypassed SECURITY DEFINER RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'PASS: employee/device limits, upgrade, downgrade, revocation, audit, inactive account, RLS and RPC gate' AS result;

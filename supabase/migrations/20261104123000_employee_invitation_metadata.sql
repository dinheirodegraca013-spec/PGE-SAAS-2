BEGIN;
CREATE OR REPLACE FUNCTION private.sync_invited_employee(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE employee auth.users%ROWTYPE; administrator public.profiles%ROWTYPE; previous_role text; internal_id text;
BEGIN
  SELECT * INTO employee FROM auth.users WHERE id=p_user_id;
  internal_id:=nullif(trim(employee.raw_app_meta_data->>'gestio_identificador_interno'),'');
  IF NOT FOUND OR employee.raw_app_meta_data->>'gestio_employee' IS DISTINCT FROM 'true'
    OR coalesce(employee.raw_app_meta_data->>'gestio_setor','') NOT IN ('corte','montagem','acabamento','instalacao','estoque','financeiro')
    OR length(coalesce(employee.raw_app_meta_data->>'gestio_cargo',''))>120
    OR (internal_id IS NOT NULL AND internal_id !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,39}$') THEN RAISE EXCEPTION 'Convite de funcionário não encontrado ou inválido.' USING ERRCODE='42501'; END IF;
  SELECT p.* INTO administrator FROM public.profiles p JOIN public.tenants t ON t.id=p.tenant_id
    WHERE p.id::text=employee.raw_app_meta_data->>'gestio_criado_por' AND p.tenant_id::text=employee.raw_app_meta_data->>'gestio_tenant_id'
      AND p.ativo AND t.ativo AND p.papel='AdministradorTenant' AND p.setor IS NULL AND p.id<>employee.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vinculação de funcionário não autorizada.' USING ERRCODE='42501'; END IF;
  IF internal_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE tenant_id=administrator.tenant_id AND lower(identificador_interno)=lower(internal_id)) THEN RAISE EXCEPTION 'Este identificador interno já está em uso nesta empresa.' USING ERRCODE='23505'; END IF;
  previous_role:=current_setting('request.jwt.claim.role',true); PERFORM set_config('request.jwt.claim.role','service_role',true);
  UPDATE public.profiles SET tenant_id=administrator.tenant_id,setor=employee.raw_app_meta_data->>'gestio_setor',cargo=nullif(trim(employee.raw_app_meta_data->>'gestio_cargo'),''),identificador_interno=internal_id,
    papel=CASE employee.raw_app_meta_data->>'gestio_setor' WHEN 'estoque' THEN 'Estoque' WHEN 'financeiro' THEN 'Financeiro' ELSE 'Instalador' END WHERE id=employee.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil do funcionário não encontrado.'; END IF;
  PERFORM set_config('request.jwt.claim.role',coalesce(previous_role,''),true);
END; $$;
COMMIT;


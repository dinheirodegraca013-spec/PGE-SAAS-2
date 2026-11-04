BEGIN;

-- Auth admin.createUser inserts the user before applying custom app_metadata.
-- Reconcile only server-issued employee invitations when those claims arrive.
CREATE FUNCTION private.sync_invited_employee(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  employee auth.users%ROWTYPE;
  administrator public.profiles%ROWTYPE;
  previous_role text;
BEGIN
  SELECT * INTO employee FROM auth.users WHERE id=p_user_id;
  IF NOT FOUND OR employee.raw_app_meta_data->>'gestio_employee' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Convite de funcionário não encontrado.' USING ERRCODE='42501';
  END IF;
  SELECT p.* INTO administrator FROM public.profiles p JOIN public.tenants t ON t.id=p.tenant_id
    WHERE p.id::text=employee.raw_app_meta_data->>'gestio_criado_por'
      AND p.tenant_id::text=employee.raw_app_meta_data->>'gestio_tenant_id'
      AND p.ativo AND t.ativo AND p.papel='AdministradorTenant' AND p.setor IS NULL
      AND p.id<>employee.id;
  IF NOT FOUND OR coalesce(employee.raw_app_meta_data->>'gestio_setor','') NOT IN
    ('corte','montagem','acabamento','instalacao','estoque','financeiro') THEN
    RAISE EXCEPTION 'Vinculação de funcionário não autorizada.' USING ERRCODE='42501';
  END IF;
  -- Scope the existing sector-write guard exemption to this private operation.
  previous_role := current_setting('request.jwt.claim.role',true);
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  UPDATE public.profiles SET
    tenant_id=administrator.tenant_id,
    setor=employee.raw_app_meta_data->>'gestio_setor',
    papel=CASE employee.raw_app_meta_data->>'gestio_setor'
      WHEN 'estoque' THEN 'Estoque' WHEN 'financeiro' THEN 'Financeiro' ELSE 'Instalador' END
    WHERE id=employee.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil do funcionário não encontrado.'; END IF;
  PERFORM set_config('request.jwt.claim.role',coalesce(previous_role,''),true);
END;
$$;
REVOKE ALL ON FUNCTION private.sync_invited_employee(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.handle_employee_metadata() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.sync_invited_employee(NEW.id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_employee_metadata() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_employee_metadata_applied AFTER UPDATE OF raw_app_meta_data ON auth.users
FOR EACH ROW WHEN (
  NEW.raw_app_meta_data->>'gestio_employee' = 'true'
  AND OLD.raw_app_meta_data->>'gestio_employee' IS DISTINCT FROM 'true'
) EXECUTE FUNCTION private.handle_employee_metadata();

-- Repair previously issued invitations using their trusted creator/company/sector.
-- Preserve all business records and do not delete the mistakenly created tenant.
DO $$ DECLARE invited record; BEGIN
  FOR invited IN
    SELECT u.id FROM auth.users u JOIN public.profiles p ON p.id=u.id
    WHERE u.raw_app_meta_data->>'gestio_employee'='true'
      AND (p.tenant_id::text IS DISTINCT FROM u.raw_app_meta_data->>'gestio_tenant_id'
        OR p.setor IS DISTINCT FROM u.raw_app_meta_data->>'gestio_setor')
  LOOP
    PERFORM private.sync_invited_employee(invited.id);
  END LOOP;
END $$;

COMMIT;

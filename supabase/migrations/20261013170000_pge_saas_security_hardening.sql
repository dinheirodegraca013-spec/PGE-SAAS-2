-- Security hardening for PGE SAAS 2
-- Least-privilege grants for SaaS tables; RLS remains the row-level authorization boundary.

BEGIN;

-- Remove broad default table privileges from public-facing roles on sensitive SaaS tables.
REVOKE ALL PRIVILEGES ON TABLE
  public.saas_usuarios_internos,
  public.saas_planos,
  public.saas_planos_links,
  public.saas_assinaturas,
  public.saas_cobrancas,
  public.saas_pagamentos,
  public.saas_gateway_configs,
  public.saas_audit_logs
FROM anon, authenticated;

-- Anonymous visitors may only read public, active catalog entries.
GRANT SELECT ON TABLE public.saas_planos, public.saas_planos_links TO anon;

-- Authenticated clients get only the operations used by the app; RLS limits rows/actions.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.saas_usuarios_internos,
  public.saas_planos,
  public.saas_planos_links,
  public.saas_assinaturas,
  public.saas_cobrancas,
  public.saas_pagamentos,
  public.saas_gateway_configs
TO authenticated;

-- Audit history is append-only for application users.
GRANT SELECT, INSERT ON TABLE public.saas_audit_logs TO authenticated;

-- Tighten policy role scope from PUBLIC to authenticated for sensitive SaaS data.
DROP POLICY IF EXISTS saas_usuarios_internos_admin ON public.saas_usuarios_internos;
CREATE POLICY saas_usuarios_internos_admin
  ON public.saas_usuarios_internos
  FOR ALL TO authenticated
  USING (private.is_saas_super_admin() OR user_id = (SELECT auth.uid()))
  WITH CHECK (private.is_saas_super_admin());

DROP POLICY IF EXISTS saas_planos_modify ON public.saas_planos;
CREATE POLICY saas_planos_modify
  ON public.saas_planos
  FOR ALL TO authenticated
  USING (private.is_saas_super_admin())
  WITH CHECK (private.is_saas_super_admin());

DROP POLICY IF EXISTS saas_planos_links_modify ON public.saas_planos_links;
CREATE POLICY saas_planos_links_modify
  ON public.saas_planos_links
  FOR ALL TO authenticated
  USING (private.is_saas_financeiro())
  WITH CHECK (private.is_saas_financeiro());

DROP POLICY IF EXISTS saas_assinaturas_modify ON public.saas_assinaturas;
CREATE POLICY saas_assinaturas_modify
  ON public.saas_assinaturas
  FOR ALL TO authenticated
  USING (private.is_saas_super_admin() OR private.is_saas_financeiro())
  WITH CHECK (private.is_saas_super_admin() OR private.is_saas_financeiro());

DROP POLICY IF EXISTS saas_assinaturas_policy ON public.saas_assinaturas;
CREATE POLICY saas_assinaturas_policy
  ON public.saas_assinaturas
  FOR SELECT TO authenticated
  USING (private.is_saas_interno() OR tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS saas_cobrancas_modify ON public.saas_cobrancas;
CREATE POLICY saas_cobrancas_modify
  ON public.saas_cobrancas
  FOR ALL TO authenticated
  USING (private.is_saas_financeiro())
  WITH CHECK (private.is_saas_financeiro());

DROP POLICY IF EXISTS saas_cobrancas_policy ON public.saas_cobrancas;
CREATE POLICY saas_cobrancas_policy
  ON public.saas_cobrancas
  FOR SELECT TO authenticated
  USING (private.is_saas_financeiro() OR tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS saas_pagamentos_policy ON public.saas_pagamentos;
CREATE POLICY saas_pagamentos_policy
  ON public.saas_pagamentos
  FOR ALL TO authenticated
  USING (private.is_saas_financeiro())
  WITH CHECK (private.is_saas_financeiro());

DROP POLICY IF EXISTS saas_gateway_configs_policy ON public.saas_gateway_configs;
CREATE POLICY saas_gateway_configs_policy
  ON public.saas_gateway_configs
  FOR ALL TO authenticated
  USING (private.is_saas_super_admin())
  WITH CHECK (private.is_saas_super_admin());

DROP POLICY IF EXISTS saas_audit_logs_select ON public.saas_audit_logs;
CREATE POLICY saas_audit_logs_select
  ON public.saas_audit_logs
  FOR SELECT TO authenticated
  USING (private.is_saas_interno());

-- A normal user cannot change their own tenant, role, activation status, or profile email.
-- SuperAdmin can perform trusted administrative corrections; tenant admins can still manage
-- other users through the existing RLS policy.
CREATE OR REPLACE FUNCTION private.prevent_profile_privilege_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) = OLD.id
     AND NOT private.is_saas_super_admin()
     AND (
       NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR
       NEW.papel IS DISTINCT FROM OLD.papel OR
       NEW.ativo IS DISTINCT FROM OLD.ativo OR
       NEW.email IS DISTINCT FROM OLD.email
     )
  THEN
    RAISE EXCEPTION 'Não é permitido alterar os campos protegidos da própria conta.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_profile_privilege_self_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_privilege_self_change ON public.profiles;
CREATE TRIGGER protect_profile_privilege_self_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_profile_privilege_self_change();

COMMIT;
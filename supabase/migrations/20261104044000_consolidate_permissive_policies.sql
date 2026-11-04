-- Consolidate overlapping authenticated policies without broadening access.
DROP POLICY IF EXISTS saas_planos_select_authenticated ON public.saas_planos;
DROP POLICY IF EXISTS saas_planos_links_select_authenticated ON public.saas_planos_links;

DROP POLICY IF EXISTS saas_assinaturas_modify ON public.saas_assinaturas;
CREATE POLICY saas_assinaturas_insert ON public.saas_assinaturas FOR INSERT TO authenticated
  WITH CHECK (private.is_saas_super_admin() OR private.is_saas_financeiro());
CREATE POLICY saas_assinaturas_update ON public.saas_assinaturas FOR UPDATE TO authenticated
  USING (private.is_saas_super_admin() OR private.is_saas_financeiro())
  WITH CHECK (private.is_saas_super_admin() OR private.is_saas_financeiro());
CREATE POLICY saas_assinaturas_delete ON public.saas_assinaturas FOR DELETE TO authenticated
  USING (private.is_saas_super_admin() OR private.is_saas_financeiro());

DROP POLICY IF EXISTS saas_cobrancas_modify ON public.saas_cobrancas;
CREATE POLICY saas_cobrancas_insert ON public.saas_cobrancas FOR INSERT TO authenticated
  WITH CHECK (private.is_saas_financeiro());
CREATE POLICY saas_cobrancas_update ON public.saas_cobrancas FOR UPDATE TO authenticated
  USING (private.is_saas_financeiro()) WITH CHECK (private.is_saas_financeiro());
CREATE POLICY saas_cobrancas_delete ON public.saas_cobrancas FOR DELETE TO authenticated
  USING (private.is_saas_financeiro());

DROP POLICY IF EXISTS saas_usuarios_internos_manage_superadmin ON public.saas_usuarios_internos;
CREATE POLICY saas_usuarios_internos_insert ON public.saas_usuarios_internos FOR INSERT TO authenticated
  WITH CHECK (private.is_saas_super_admin());
CREATE POLICY saas_usuarios_internos_update ON public.saas_usuarios_internos FOR UPDATE TO authenticated
  USING (private.is_saas_super_admin()) WITH CHECK (private.is_saas_super_admin());
CREATE POLICY saas_usuarios_internos_delete ON public.saas_usuarios_internos FOR DELETE TO authenticated
  USING (private.is_saas_super_admin());

DROP POLICY IF EXISTS tenant_members_read_own_tenant ON public.tenants;
DROP POLICY IF EXISTS tenants_read_saas_internal ON public.tenants;
CREATE POLICY tenants_read_authenticated ON public.tenants FOR SELECT TO authenticated
  USING (id = (SELECT private.current_tenant_id()) OR private.is_saas_interno());


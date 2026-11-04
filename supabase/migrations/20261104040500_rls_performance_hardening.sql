-- Keep tenant/identity lookups initplan-friendly. The semantics remain the
-- same; auth and stable helper calls are evaluated once per statement.
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin ON public.profiles FOR UPDATE TO authenticated
USING ((id=(SELECT auth.uid())) OR (tenant_id=(SELECT private.current_tenant_id()) AND (SELECT private.current_user_role())='AdministradorTenant'))
WITH CHECK (((id=(SELECT auth.uid())) AND tenant_id=(SELECT private.current_tenant_id()) AND papel=(SELECT private.current_user_role())) OR (tenant_id=(SELECT private.current_tenant_id()) AND (SELECT private.current_user_role())='AdministradorTenant'));

DROP POLICY IF EXISTS estoque_itens_read ON public.estoque_itens;
CREATE POLICY estoque_itens_read ON public.estoque_itens FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND tenant_id=(SELECT private.current_tenant_id()));
DROP POLICY IF EXISTS estoque_mov_read ON public.estoque_movimentacoes;
CREATE POLICY estoque_mov_read ON public.estoque_movimentacoes FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND tenant_id=(SELECT private.current_tenant_id()));
DROP POLICY IF EXISTS financeiro_lancamentos_select ON public.financeiro_lancamentos;
CREATE POLICY financeiro_lancamentos_select ON public.financeiro_lancamentos FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND tenant_id=(SELECT private.current_tenant_id()));
DROP POLICY IF EXISTS financeiro_baixas_select ON public.financeiro_baixas;
CREATE POLICY financeiro_baixas_select ON public.financeiro_baixas FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND tenant_id=(SELECT private.current_tenant_id()));

DROP POLICY IF EXISTS saas_audit_logs_insert ON public.saas_audit_logs;
CREATE POLICY saas_audit_logs_insert ON public.saas_audit_logs FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_saas_interno()) AND usuario_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_read_saas_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_read_same_tenant ON public.profiles;
CREATE POLICY profiles_read_same_tenant_or_admin ON public.profiles FOR SELECT TO authenticated
USING (
  id=(SELECT auth.uid())
  OR ((tenant_id=(SELECT private.current_tenant_id())) AND (SELECT private.current_user_role())=ANY(ARRAY['AdministradorTenant'::text,'SuperAdmin'::text]))
  OR (SELECT private.is_saas_super_admin())
);

-- This restrictive policy is created by the employee-permissions migration;
-- replacing it here makes the final policy initplan-friendly as well.
DROP POLICY IF EXISTS employee_own_profile ON public.profiles;
CREATE POLICY employee_own_profile ON public.profiles AS RESTRICTIVE FOR ALL TO authenticated
USING ((SELECT private.operational_owner(tenant_id)) OR id=(SELECT auth.uid()))
WITH CHECK ((SELECT private.operational_owner(tenant_id)) OR id=(SELECT auth.uid()));

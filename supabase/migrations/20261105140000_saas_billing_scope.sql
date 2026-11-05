-- Billing and subscription details are administrative data, not employee data.
drop policy if exists saas_assinaturas_select on public.saas_assinaturas;
create policy saas_assinaturas_select on public.saas_assinaturas
  for select to authenticated
  using (
    private.is_saas_interno()
    or (
      tenant_id = private.current_tenant_id()
      and private.current_user_role() in ('AdministradorTenant', 'SuperAdmin')
    )
  );

drop policy if exists saas_cobrancas_select on public.saas_cobrancas;
create policy saas_cobrancas_select on public.saas_cobrancas
  for select to authenticated
  using (
    private.is_saas_financeiro()
    or (
      tenant_id = private.current_tenant_id()
      and private.current_user_role() in ('AdministradorTenant', 'SuperAdmin')
    )
  );

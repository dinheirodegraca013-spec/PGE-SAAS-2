-- Company registration and contact data is administrative, not employee-wide.
drop policy if exists tenant_dados_comerciais_select on public.tenant_dados_comerciais;
create policy tenant_dados_comerciais_select on public.tenant_dados_comerciais
  for select to authenticated
  using (
    (tenant_id = private.current_tenant_id()
      and private.current_user_role() in ('AdministradorTenant', 'SuperAdmin'))
    or private.is_saas_super_admin()
  );


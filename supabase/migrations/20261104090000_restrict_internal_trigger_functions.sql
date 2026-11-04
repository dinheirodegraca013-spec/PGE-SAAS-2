-- Internal compatibility and trigger helpers must not be callable through PostgREST.
-- Trigger execution remains owned by PostgreSQL; application RPCs use private helpers.
revoke execute on function public.current_tenant_id() from public, anon;
revoke execute on function public.estoque_verificar_tenant_projeto() from public, anon, authenticated;
revoke execute on function public.financeiro_verificar_tenant_projeto() from public, anon, authenticated;
revoke execute on function public.normalize_tenant_plan_before_write() from public, anon, authenticated;

grant execute on function public.current_tenant_id() to authenticated;


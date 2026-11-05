create or replace function public.financeiro_resumo_baixas()
returns table(receitas numeric, despesas numeric)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_tenant uuid;
begin
  perform private.require_authorized_session();
  v_tenant := private.current_tenant_id();
  if private.operational_permission(v_tenant, 'financeiro', 'relatorios', 'financeiro', true) is not true then
    raise exception 'Sem permissão para consultar o resumo financeiro.' using errcode = '42501';
  end if;
  return query
  select
    coalesce(sum(case when l.tipo = 'receita' then b.valor else 0 end), 0)::numeric,
    coalesce(sum(case when l.tipo = 'despesa' then b.valor else 0 end), 0)::numeric
  from public.financeiro_baixas b
  join public.financeiro_lancamentos l on l.id = b.lancamento_id and l.tenant_id = b.tenant_id
  where b.tenant_id = v_tenant;
end;
$fn$;

revoke all on function public.financeiro_resumo_baixas() from public, anon;
grant execute on function public.financeiro_resumo_baixas() to authenticated;


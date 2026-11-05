-- Administrative tenant archival used by the SaaS back office.
-- This is a soft delete: operational and financial history remains queryable.
create or replace function public.admin_excluir_empresa(
  p_tenant_id uuid,
  p_confirmacao text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_role text;
  v_razao text;
  v_uid uuid;
  v_email text;
begin
  v_uid := auth.uid();
  v_email := coalesce(auth.email(), '');
  v_role := private.get_saas_user_internal_role(v_uid);

  if v_uid is null or v_role is distinct from 'SuperAdmin' then
    raise exception 'Apenas SuperAdmin pode arquivar empresas.' using errcode = '42501';
  end if;
  if p_tenant_id is null or nullif(trim(p_confirmacao), '') is null then
    raise exception 'Empresa e confirmação são obrigatórias.' using errcode = '22023';
  end if;

  select t.razao_social into v_razao
  from public.tenants t
  where t.id = p_tenant_id
  for update;

  if v_razao is null then
    raise exception 'Empresa não encontrada.' using errcode = 'P0002';
  end if;
  if trim(p_confirmacao) is distinct from v_razao then
    raise exception 'A confirmação não corresponde à razão social.' using errcode = '22023';
  end if;

  update public.tenants
  set ativo = false, updated_at = now()
  where id = p_tenant_id;

  update public.profiles
  set ativo = false, suspenso = true, acesso_versao = acesso_versao + 1, updated_at = now()
  where tenant_id = p_tenant_id;

  update public.saas_assinaturas
  set status = 'cancelada', cancelada_em = now(), motivo_cancelamento = 'Arquivamento administrativo', updated_at = now()
  where tenant_id = p_tenant_id and status <> 'cancelada';

  insert into public.saas_audit_logs (id, usuario_id, usuario_email, papel_operador, acao, modulo, registro_id, detalhes)
  values (
    gen_random_uuid()::text, v_uid, v_email, v_role, 'ARQUIVAR_EMPRESA', 'Empresas', p_tenant_id::text,
    jsonb_build_object('razao_social', v_razao, 'motivo', 'Arquivamento administrativo', 'acessos_desativados', true)
  );

  return jsonb_build_object('success', true, 'message', 'Empresa arquivada com segurança.');
end;
$fn$;

revoke all on function public.admin_excluir_empresa(uuid, text) from public, anon;
grant execute on function public.admin_excluir_empresa(uuid, text) to authenticated;


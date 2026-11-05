-- Funcionários podem editar somente dados pessoais não autorizadores do próprio perfil.
-- Setor, cargo, status, tenant, e-mail e identificador interno permanecem sob gestão administrativa.
create or replace function private.protect_employee_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_role text;
begin
  if auth.uid() is null then
    return new;
  end if;

  actor_role := private.current_user_role();
  if actor_role in ('AdministradorTenant', 'SuperAdmin') or private.is_saas_interno() then
    return new;
  end if;

  if auth.uid() = old.id and (
    new.id is distinct from old.id
    or new.tenant_id is distinct from old.tenant_id
    or new.email is distinct from old.email
    or new.papel is distinct from old.papel
    or new.ativo is distinct from old.ativo
    or new.setor is distinct from old.setor
    or new.cargo is distinct from old.cargo
    or new.suspenso is distinct from old.suspenso
    or new.acesso_versao is distinct from old.acesso_versao
    or new.identificador_interno is distinct from old.identificador_interno
  ) then
    raise exception using
      errcode = '42501',
      message = 'Somente administradores podem alterar os campos de autorização do funcionário';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_employee_profile_fields on public.profiles;
create trigger protect_employee_profile_fields
before update on public.profiles
for each row execute function private.protect_employee_profile_fields();

revoke all on function private.protect_employee_profile_fields() from public, anon, authenticated;

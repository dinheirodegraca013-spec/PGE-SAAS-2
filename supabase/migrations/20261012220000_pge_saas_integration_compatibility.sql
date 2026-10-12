-- Compatibility and tenant provisioning for PGE SAAS 2.
-- Non-destructive: adds fields used by the current UI and tightens signup/profile handling.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- These narrowly scoped helpers avoid recursive RLS evaluation on profiles.
create or replace function private.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $
  select p.tenant_id
  from public.profiles p
  where p.id = (select auth.uid()) and p.ativo = true
  limit 1
$;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $
  select p.papel
  from public.profiles p
  where p.id = (select auth.uid()) and p.ativo = true
  limit 1
$;

revoke all on function private.current_tenant_id() from public, anon, authenticated;
revoke all on function private.current_user_role() from public, anon, authenticated;
grant execute on function private.current_tenant_id() to authenticated;
grant execute on function private.current_user_role() to authenticated;

-- Fields expected by the current client adapter, while preserving the canonical columns.
alter table public.clientes
  add column if not exists cpf_cnpj text,
  add column if not exists telefone_whatsapp text,
  add column if not exists origem text not null default 'Manual';

alter table public.servicos
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null,
  add column if not exists cliente_nome text,
  add column if not exists titulo text,
  add column if not exists escopo text,
  add column if not exists origem text not null default 'Manual',
  add column if not exists usuario_responsavel_id uuid references auth.users(id) on delete set null;

alter table public.servicos drop constraint if exists servicos_status_check;
alter table public.servicos
  add constraint servicos_status_check
  check (status = any (array[
    'ativo','inativo','arquivado',
    'EmAndamento','EscopoDefinido','OrcamentoEnviado','Aprovado','Concluido','Cancelado'
  ]));

alter table public.projetos_marcenaria
  add column if not exists titulo text,
  add column if not exists valor_total_orcamento numeric,
  add column if not exists valor_total numeric,
  add column if not exists observacoes text,
  add column if not exists ambientes jsonb not null default '[]'::jsonb,
  add column if not exists data_medicao_agendada date,
  add column if not exists data_prevista_entrega date;

alter table public.orcamentos
  add column if not exists valor_total numeric,
  add column if not exists data_validade timestamptz,
  add column if not exists observacoes_gerais text,
  add column if not exists tem_pdf_assinado boolean not null default false,
  add column if not exists assinado_por_nome text;

alter table public.orcamentos drop constraint if exists orcamentos_status_check;
alter table public.orcamentos
  add constraint orcamentos_status_check
  check (status = any (array[
    'rascunho','enviado','visualizado','assinado','recusado','cancelado',
    'Pendente','Assinado','Aprovado','Enviado','Visualizado','Recusado','Cancelado'
  ]));

alter table public.whatsapp_mensagens
  add column if not exists telefone text,
  add column if not exists telefone_origem text,
  add column if not exists telefone_origem_e164 text,
  add column if not exists conteudo text,
  add column if not exists texto text,
  add column if not exists ultima_mensagem_texto text,
  add column if not exists quantidade_mensagens integer not null default 1;

alter table public.whatsapp_mensagens drop constraint if exists whatsapp_mensagens_status_check;
alter table public.whatsapp_mensagens
  add constraint whatsapp_mensagens_status_check
  check (status = any (array['pendente','enviada','falhou','Aprovada','Ignorada']));

-- The existing UI includes a WhatsApp settings screen. Keep its credentials private
-- to tenant administrators; never grant access to anonymous clients.
create table if not exists public.whatsapp_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  phone_number_id text,
  access_token text,
  business_account_id text,
  numero_origem text,
  webhook_verify_token text,
  configurado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_config enable row level security;
revoke all on public.whatsapp_config from anon, authenticated;
grant select, insert, update on public.whatsapp_config to authenticated;

drop policy if exists whatsapp_config_admin_read on public.whatsapp_config;
create policy whatsapp_config_admin_read on public.whatsapp_config
  for select to authenticated
  using (
    tenant_id = (select private.current_tenant_id())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.tenant_id = whatsapp_config.tenant_id
        and p.ativo = true
        and p.papel in ('AdministradorTenant','SuperAdmin')
    )
  );

drop policy if exists whatsapp_config_admin_insert on public.whatsapp_config;
create policy whatsapp_config_admin_insert on public.whatsapp_config
  for insert to authenticated
  with check (
    tenant_id = (select private.current_tenant_id())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.tenant_id = whatsapp_config.tenant_id
        and p.ativo = true
        and p.papel in ('AdministradorTenant','SuperAdmin')
    )
  );

drop policy if exists whatsapp_config_admin_update on public.whatsapp_config;
create policy whatsapp_config_admin_update on public.whatsapp_config
  for update to authenticated
  using (
    tenant_id = (select private.current_tenant_id())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.tenant_id = whatsapp_config.tenant_id
        and p.ativo = true
        and p.papel in ('AdministradorTenant','SuperAdmin')
    )
  )
  with check (
    tenant_id = (select private.current_tenant_id())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.tenant_id = whatsapp_config.tenant_id
        and p.ativo = true
        and p.papel in ('AdministradorTenant','SuperAdmin')
    )
  );

-- Audit writes were previously attempted silently but lacked an INSERT policy.
drop policy if exists audit_logs_tenant_insert_self on public.audit_logs;
create policy audit_logs_tenant_insert_self on public.audit_logs
  for insert to authenticated
  with check (
    tenant_id = (select private.current_tenant_id())
    and actor_id = (select auth.uid())
  );

-- Provision a tenant and its first administrator atomically when a Supabase Auth user is created.
-- The trigger does not trust tenant IDs or role values supplied in user-editable metadata.
create or replace function private.handle_new_pge_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_email text;
  v_name text;
  v_razao text;
  v_fantasia text;
  v_plano text;
begin
  v_email := coalesce(new.email, '');
  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome_completo', '')), '');
  if v_name is null then
    v_name := coalesce(nullif(split_part(v_email, '@', 1), ''), 'Administrador');
  end if;

  v_razao := nullif(trim(coalesce(new.raw_user_meta_data ->> 'razao_social', '')), '');
  if v_razao is null then
    v_razao := coalesce(nullif(split_part(v_email, '@', 1), ''), 'Empresa');
  end if;

  v_fantasia := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome_fantasia', '')), '');
  v_plano := lower(coalesce(new.raw_user_meta_data ->> 'plano', 'free'));
  if v_plano not in ('free','standard','empresarial') then
    v_plano := 'free';
  end if;

  insert into public.tenants (razao_social, nome_fantasia, plano)
  values (v_razao, v_fantasia, v_plano)
  returning id into v_tenant_id;

  insert into public.profiles (id, tenant_id, nome_completo, email, papel, ativo)
  values (new.id, v_tenant_id, v_name, v_email, 'AdministradorTenant', true);

  return new;
end;
$$;

revoke all on function private.handle_new_pge_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_pge on auth.users;
create trigger on_auth_user_created_pge
  after insert on auth.users
  for each row execute function private.handle_new_pge_user();


-- Replace recursive/overly permissive policies with tenant-scoped policies using
-- the private SECURITY DEFINER helpers. These helpers expose only the caller's own claims.
drop policy if exists clientes_tenant_isolation on public.clientes;
create policy clientes_tenant_isolation on public.clientes
  for all to authenticated
  using (tenant_id = (select private.current_tenant_id()))
  with check (tenant_id = (select private.current_tenant_id()));

drop policy if exists servicos_tenant_isolation on public.servicos;
create policy servicos_tenant_isolation on public.servicos
  for all to authenticated
  using (tenant_id = (select private.current_tenant_id()))
  with check (tenant_id = (select private.current_tenant_id()));

drop policy if exists projetos_tenant_isolation on public.projetos_marcenaria;
create policy projetos_tenant_isolation on public.projetos_marcenaria
  for all to authenticated
  using (tenant_id = (select private.current_tenant_id()))
  with check (tenant_id = (select private.current_tenant_id()));

drop policy if exists orcamentos_tenant_isolation on public.orcamentos;
create policy orcamentos_tenant_isolation on public.orcamentos
  for all to authenticated
  using (tenant_id = (select private.current_tenant_id()))
  with check (tenant_id = (select private.current_tenant_id()));

drop policy if exists whatsapp_tenant_isolation on public.whatsapp_mensagens;
create policy whatsapp_tenant_isolation on public.whatsapp_mensagens
  for all to authenticated
  using (tenant_id = (select private.current_tenant_id()))
  with check (tenant_id = (select private.current_tenant_id()));

drop policy if exists tenant_members_read_own_tenant on public.tenants;
create policy tenant_members_read_own_tenant on public.tenants
  for select to authenticated
  using (id = (select private.current_tenant_id()));

drop policy if exists profiles_read_same_tenant on public.profiles;
create policy profiles_read_same_tenant on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (
      tenant_id = (select private.current_tenant_id())
      and (select private.current_user_role()) in ('AdministradorTenant','SuperAdmin')
    )
  );

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (
    id = (select auth.uid())
    or (
      tenant_id = (select private.current_tenant_id())
      and (select private.current_user_role()) in ('AdministradorTenant','SuperAdmin')
    )
  )
  with check (tenant_id = (select private.current_tenant_id()));

-- Prevent self-promotion or tenant reassignment through direct profile updates.
revoke update on public.profiles from anon, authenticated;
grant update (nome_completo, email) on public.profiles to authenticated;

drop policy if exists audit_logs_tenant_read_admin on public.audit_logs;
create policy audit_logs_tenant_read_admin on public.audit_logs
  for select to authenticated
  using (
    tenant_id = (select private.current_tenant_id())
    and (select private.current_user_role()) in ('AdministradorTenant','SuperAdmin')
  );

-- Expose only the safe configuration fields through the app's ordinary read query;
-- the client adapter is updated separately to select only these fields.

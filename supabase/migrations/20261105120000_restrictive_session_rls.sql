-- Make device/session validation restrictive instead of a permissive OR policy.
-- Without this, a valid session policy could bypass tenant/resource policies.
drop policy if exists authorized_login_session on public.audit_logs;
create policy authorized_login_session on public.audit_logs
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.clientes;
create policy authorized_login_session on public.clientes
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.estoque_itens;
create policy authorized_login_session on public.estoque_itens
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.estoque_movimentacoes;
create policy authorized_login_session on public.estoque_movimentacoes
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.financeiro_baixas;
create policy authorized_login_session on public.financeiro_baixas
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.financeiro_lancamentos;
create policy authorized_login_session on public.financeiro_lancamentos
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.orcamentos;
create policy authorized_login_session on public.orcamentos
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.profiles;
create policy authorized_login_session on public.profiles
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.projetos_marcenaria;
create policy authorized_login_session on public.projetos_marcenaria
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.projetos_setores;
create policy authorized_login_session on public.projetos_setores
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.saas_assinaturas;
create policy authorized_login_session on public.saas_assinaturas
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.saas_cobrancas;
create policy authorized_login_session on public.saas_cobrancas
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.saas_pagamentos;
create policy authorized_login_session on public.saas_pagamentos
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.servicos;
create policy authorized_login_session on public.servicos
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.tenant_dados_comerciais;
create policy authorized_login_session on public.tenant_dados_comerciais
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.tenants;
create policy authorized_login_session on public.tenants
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.whatsapp_config;
create policy authorized_login_session on public.whatsapp_config
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

drop policy if exists authorized_login_session on public.whatsapp_mensagens;
create policy authorized_login_session on public.whatsapp_mensagens
  as restrictive
  for all to authenticated
  using ((select private.device_session_allowed()))
  with check ((select private.device_session_allowed()));

-- Financial rows must be governed by the row-level permission function.
drop policy if exists financeiro_lancamentos_select on public.financeiro_lancamentos;
drop policy if exists financeiro_baixas_select on public.financeiro_baixas;


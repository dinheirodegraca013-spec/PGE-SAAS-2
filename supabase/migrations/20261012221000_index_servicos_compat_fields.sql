-- Index compatibility foreign keys used by the PGE SAAS 2 service module.
create index if not exists servicos_cliente_id_idx
  on public.servicos (cliente_id);
create index if not exists servicos_usuario_responsavel_id_idx
  on public.servicos (usuario_responsavel_id);

-- Public quote access is handled by the public-orcamento Edge Function.
-- The browser never receives direct anonymous SELECT/UPDATE rights to orcamentos.
alter table public.orcamentos
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists orcamentos_public_token_key
  on public.orcamentos(public_token);

drop function if exists public.get_public_orcamento(uuid);
drop function if exists public.assinar_orcamento_publico(uuid, text);

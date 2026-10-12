-- Public quote access uses a random token, not the internal row ID.
alter table public.orcamentos
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists orcamentos_public_token_key
  on public.orcamentos(public_token);

create or replace function public.get_public_orcamento(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select jsonb_build_object(
    'id', o.id,
    'servico_id', o.servico_id,
    'itens', o.itens,
    'valor_total', o.valor_total,
    'data_validade', o.data_validade,
    'observacoes_gerais', o.observacoes_gerais,
    'status', o.status,
    'tem_pdf_assinado', o.tem_pdf_assinado,
    'assinado_por_nome', o.assinado_por_nome,
    'assinado_em', o.assinado_em
  )
  from public.orcamentos o
  where o.public_token = p_token
    and (o.data_validade is null or o.data_validade >= now())
    and lower(o.status) in ('pendente', 'enviado', 'visualizado', 'assinado')
  limit 1
$fn$;

create or replace function public.assinar_orcamento_publico(p_token uuid, p_nome text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_orcamento public.orcamentos%rowtype;
begin
  if p_nome is null or length(trim(p_nome)) < 3 then
    raise exception 'Informe o nome completo para registrar o aceite.';
  end if;

  update public.orcamentos o
     set status = 'Assinado',
         tem_pdf_assinado = true,
         assinado_por_nome = left(trim(p_nome), 160),
         assinado_em = now(),
         updated_at = now()
   where o.public_token = p_token
     and (o.data_validade is null or o.data_validade >= now())
     and lower(o.status) in ('pendente', 'enviado', 'visualizado')
     and coalesce(o.tem_pdf_assinado, false) = false
  returning o.* into v_orcamento;

  if not found then
    select o.* into v_orcamento
      from public.orcamentos o
     where o.public_token = p_token
       and (o.data_validade is null or o.data_validade >= now())
       and lower(o.status) = 'assinado'
     limit 1;
    if not found then
      raise exception 'Orçamento não encontrado, expirado ou indisponível.';
    end if;
  else
    if v_orcamento.servico_id is not null then
      update public.servicos
         set status = 'Aprovado', updated_at = now()
       where id = v_orcamento.servico_id
         and tenant_id = v_orcamento.tenant_id;
    end if;
    insert into public.audit_logs (tenant_id, actor_id, acao, tabela, registro_id, detalhes)
    values (
      v_orcamento.tenant_id,
      null,
      'ASSINAR_PUBLICO',
      'orcamentos',
      v_orcamento.id::text,
      jsonb_build_object('nome', left(trim(p_nome), 160), 'canal', 'link_publico')
    );
  end if;

  return jsonb_build_object(
    'id', v_orcamento.id,
    'servico_id', v_orcamento.servico_id,
    'itens', v_orcamento.itens,
    'valor_total', v_orcamento.valor_total,
    'data_validade', v_orcamento.data_validade,
    'observacoes_gerais', v_orcamento.observacoes_gerais,
    'status', v_orcamento.status,
    'tem_pdf_assinado', v_orcamento.tem_pdf_assinado,
    'assinado_por_nome', v_orcamento.assinado_por_nome,
    'assinado_em', v_orcamento.assinado_em
  );
end;
$fn$;

revoke all on function public.get_public_orcamento(uuid) from public, authenticated, anon;
revoke all on function public.assinar_orcamento_publico(uuid, text) from public, authenticated, anon;
grant execute on function public.get_public_orcamento(uuid) to anon, authenticated;
grant execute on function public.assinar_orcamento_publico(uuid, text) to anon, authenticated;

import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const base = readFileSync(new URL('../supabase/proposals/pge2_estoque_base.sql', import.meta.url), 'utf8');
const tx = readFileSync(new URL('../supabase/proposals/pge2_estoque_transacional.sql', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/views/estoque/EstoqueView.tsx', import.meta.url), 'utf8');

test('RLS protects both stock tables by tenant', () => {
  for (const table of ['estoque_itens', 'estoque_movimentacoes']) {
    assert.match(base, new RegExp('ALTER TABLE public\\.' + table + ' ENABLE ROW LEVEL SECURITY'));
  }
  assert.equal((base.match(/tenant_id = \(SELECT private\.current_tenant_id\(\)\)/g) || []).length, 2);
});

test('writes require transactional RPC instead of direct table grants', () => {
  assert.match(base, /REVOKE INSERT,UPDATE,DELETE ON public\.estoque_itens,public\.estoque_movimentacoes FROM authenticated/);
  assert.match(tx, /SECURITY DEFINER SET search_path = ''/);
  assert.match(tx, /GRANT EXECUTE ON FUNCTION public\.estoque_registrar_movimento.*TO authenticated/);
});

test('movement checks tenant, role, active status, and project tenant', () => {
  assert.match(tx, /v_tenant := private\.current_tenant_id\(\)/);
  assert.match(tx, /p\.id = auth\.uid\(\) AND p\.tenant_id = v_tenant/);
  assert.match(tx, /v_ativo IS DISTINCT FROM true/);
  assert.match(tx, /p_projeto_id IS NOT NULL AND NOT EXISTS/);
  assert.match(tx, /tenant_id = v_tenant/);
});

test('atomic balance update rejects negative balances', () => {
  assert.match(tx, /UPDATE public\.estoque_itens SET saldo = saldo \+ v_delta/);
  assert.match(tx, /AND saldo \+ v_delta >= 0/);
  assert.match(tx, /CHECK \(saldo >= 0\)/);
  assert.match(tx, /IF NOT FOUND THEN[\s\S]*saldo insuficiente/);
});

test('movement validates quantity and allowed types', () => {
  assert.match(tx, /p_quantidade <= 0/);
  assert.match(tx, /p_quantidade <> round\(p_quantidade, 3\)/);
  assert.match(tx, /p_tipo IS NULL OR p_tipo NOT IN/);
  assert.match(base, /CHECK \(quantidade > 0\)/);
});

test('frontend uses RPC and never writes stock tables directly', () => {
  assert.match(view, /supabase\.rpc\('estoque_registrar_movimento'/);
  assert.doesNotMatch(view, /\.from\('estoque_(itens|movimentacoes)'\)\.(insert|update|delete)/);
});

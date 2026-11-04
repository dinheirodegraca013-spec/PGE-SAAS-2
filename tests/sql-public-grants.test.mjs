import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('internal trigger helpers are not exposed through PostgREST', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261104090000_restrict_internal_trigger_functions.sql', import.meta.url), 'utf8');
  for (const name of ['estoque_verificar_tenant_projeto', 'financeiro_verificar_tenant_projeto', 'normalize_tenant_plan_before_write']) {
    assert.match(sql, new RegExp(`revoke execute on function public\\.${name}\\(\\) from public, anon, authenticated`, 'i'));
  }
  assert.match(sql, /revoke execute on function public\.current_tenant_id\(\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.current_tenant_id\(\) to authenticated/i);
});


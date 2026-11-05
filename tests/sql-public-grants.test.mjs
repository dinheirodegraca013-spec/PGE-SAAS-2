import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

test('internal trigger helpers are not exposed through PostgREST', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261104090000_restrict_internal_trigger_functions.sql', import.meta.url), 'utf8');
  for (const name of ['estoque_verificar_tenant_projeto', 'financeiro_verificar_tenant_projeto', 'normalize_tenant_plan_before_write']) {
    assert.match(sql, new RegExp(`revoke execute on function public\\.${name}\\(\\) from public, anon, authenticated`, 'i'));
  }
  assert.match(sql, /revoke execute on function public\.current_tenant_id\(\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.current_tenant_id\(\) to authenticated/i);
});

async function collectFiles(directory, extensions) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path, extensions));
    else if (extensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

test('frontend RPCs and Edge Functions have a versioned backend implementation', async () => {
  const root = new URL('..', import.meta.url);
  const sourceFiles = await collectFiles(fileURLToPath(new URL('src/', root)), new Set(['.ts', '.tsx']));
  const migrationFiles = await collectFiles(fileURLToPath(new URL('supabase/migrations/', root)), new Set(['.sql']));
  const migrationSource = (await Promise.all(migrationFiles.map(file => readFile(file, 'utf8')))).join('\n');
  const rpcNames = new Set();
  const edgeNames = new Set();

  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/\.rpc\(\s*['"]([a-z0-9_]+)['"]/gi)) rpcNames.add(match[1]);
    for (const match of source.matchAll(/functions\.invoke\(\s*['"]([a-z0-9-]+)['"]/gi)) edgeNames.add(match[1]);
  }

  for (const name of rpcNames) {
    assert.match(migrationSource, new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${name}\\b`, 'i'), `RPC sem migration: ${name}`);
  }
  const edgeDirectories = new Set((await readdir(new URL('../supabase/functions/', import.meta.url), { withFileTypes: true }))
    .filter(entry => entry.isDirectory()).map(entry => entry.name));
  for (const name of edgeNames) assert.ok(edgeDirectories.has(name), `Edge Function ausente: ${name}`);
  assert.ok(rpcNames.size > 0);
  assert.ok(edgeNames.size > 0);
});

test('administrative and financial RPCs keep anonymous execution revoked', async () => {
  const archive = await readFile(new URL('../supabase/migrations/20261105110000_admin_archive_tenant_rpc.sql', import.meta.url), 'utf8');
  const summary = await readFile(new URL('../supabase/migrations/20261105111000_financeiro_resumo_baixas.sql', import.meta.url), 'utf8');
  assert.match(archive, /revoke all on function public\.admin_excluir_empresa\(uuid, text\) from public, anon/i);
  assert.match(archive, /grant execute on function public\.admin_excluir_empresa\(uuid, text\) to authenticated/i);
  assert.match(summary, /revoke all on function public\.financeiro_resumo_baixas\(\) from public, anon/i);
  assert.match(summary, /grant execute on function public\.financeiro_resumo_baixas\(\) to authenticated/i);
});

test('device session RLS is restrictive and financial reads stay permission-scoped', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261105120000_restrictive_session_rls.sql', import.meta.url), 'utf8');
  const financial = await readFile(new URL('../supabase/migrations/20261105123000_financial_rls_row_scope.sql', import.meta.url), 'utf8');
  assert.equal((sql.match(/as restrictive/gi) || []).length, 18);
  assert.match(sql, /drop policy if exists financeiro_lancamentos_select/i);
  assert.match(sql, /drop policy if exists financeiro_baixas_select/i);
  assert.match(financial, /drop policy if exists employee_sector_boundary on public\.financeiro_lancamentos/i);
  assert.match(financial, /drop policy if exists employee_sector_boundary on public\.financeiro_baixas/i);
});

test('company commercial data is administrative-only', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261105130000_tenant_commercial_data_scope.sql', import.meta.url), 'utf8');
  assert.match(sql, /private\.current_user_role\(\) in \('AdministradorTenant', 'SuperAdmin'\)/i);
  assert.match(sql, /private\.is_saas_super_admin\(\)/i);
});


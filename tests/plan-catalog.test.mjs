import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const migration = readFileSync(new URL('../supabase/migrations/20261013190000_customer_photo_plan_management_and_free_limits.sql', import.meta.url), 'utf8');
const visualCatalog = readFileSync(new URL('../src/views/auth/planos.ts', import.meta.url), 'utf8');

test('catálogo visual mantém os preços mensais do catálogo SQL', () => {
  assert.match(migration, /'plano_free'[\s\S]*?\n\s+0\.00,/);
  assert.match(migration, /'plano_standard'[\s\S]*?\n\s+89\.90,/);
  assert.match(migration, /'plano_empresarial'[\s\S]*?\n\s+199\.90,/);
  assert.match(visualCatalog, /precoMensal: 'R\$ 0'/);
  assert.match(visualCatalog, /precoMensal: 'R\$ 89,90\/mês'/);
  assert.match(visualCatalog, /precoMensal: 'R\$ 199,90\/mês'/);
});

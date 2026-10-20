import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const migration = readFileSync(new URL('../supabase/migrations/20261020153000_official_project_plan_catalog.sql', import.meta.url), 'utf8');
const visualCatalog = readFileSync(new URL('../src/views/auth/planos.ts', import.meta.url), 'utf8');

test('catálogo visual mantém os preços mensais do catálogo SQL', () => {
  assert.match(migration, /nome = 'Básico'[\s\S]*?preco = 39\.90/);
  assert.match(migration, /nome = 'Profissional'[\s\S]*?preco = 79\.90/);
  assert.match(migration, /nome = 'Premium\/Plus'[\s\S]*?preco = 129\.90/);
  assert.match(visualCatalog, /nome: 'Básico'[\s\S]*?precoMensal: 'R\$ 39,90\/mês'/);
  assert.match(visualCatalog, /nome: 'Profissional'[\s\S]*?precoMensal: 'R\$ 79,90\/mês'/);
  assert.match(visualCatalog, /nome: 'Premium\/Plus'[\s\S]*?precoMensal: 'R\$ 129,90\/mês'/);
});

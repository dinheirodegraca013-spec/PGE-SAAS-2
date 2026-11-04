import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const view = fs.readFileSync(new URL('../src/views/estoque/EstoqueView.tsx', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/20261104042000_workforce_stock_metadata.sql', import.meta.url), 'utf8');

test('metadados técnicos do estoque usam RPC protegida e tenant', () => {
  assert.match(view, /estoque_atualizar_dados_tecnicos/);
  assert.doesNotMatch(view, /from\(["']estoque_itens["']\)\.(insert|update|upsert|delete)/);
  for (const field of ['sku', 'categoria', 'fabricante', 'localizacao', 'prateleira', 'lote', 'validade', 'fornecedor', 'estoque_maximo']) {
    assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS ${field}`));
  }
  assert.match(migration, /private\.operational_permission\(company,'estoque','editar'/);
  assert.match(migration, /INSERT INTO public\.audit_logs/);
});


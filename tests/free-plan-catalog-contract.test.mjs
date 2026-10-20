import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const sql = readFileSync(new URL('../supabase/migrations/20261020140000_fix_free_plan_catalog_id.sql', import.meta.url), 'utf8');

test('downgrade para Free usa o ID real do catálogo', () => {
  assert.match(sql, /lower\(trim\(sp\.nome\)\) = 'free'/);
  assert.match(sql, /sp\.status = 'ativo'/);
  assert.match(sql, /SET plano = 'free'/);
  assert.doesNotMatch(sql, /SET plano = 'Free'/);
  assert.doesNotMatch(sql, /v_free_plano_id\s*:=\s*'plano_free'/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.migrar_para_plano_free\(\)/);
});

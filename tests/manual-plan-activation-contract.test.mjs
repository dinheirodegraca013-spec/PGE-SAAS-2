import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const sql = readFileSync(new URL('../supabase/migrations/20261019205000_manual_plan_activation.sql', import.meta.url), 'utf8');

test('nova ativação manual inicia o ciclo na data da ativação', () => {
  assert.match(sql, /data_contratacao=v_now/);
  assert.match(sql, /inicio_utilizacao=v_now/);
  assert.match(sql, /Plano já ativo; datas preservadas/);
});

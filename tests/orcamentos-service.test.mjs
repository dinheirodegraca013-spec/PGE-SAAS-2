import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('serviço de orçamentos não contém fallback de API local', async () => {
  const source = await readFile('src/modules/orcamentos/services/orcamentos.service.ts', 'utf8');
  assert.doesNotMatch(source, /localhost(?::\d+)?/i);
  assert.doesNotMatch(source, /VITE_API_BASE_URL/);
});


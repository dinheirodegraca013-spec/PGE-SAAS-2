import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('orçamento público fixa dependência e limita payloads', async () => {
  const source = await readFile('supabase/functions/public-orcamento/index.ts', 'utf8');
  assert.match(source, /npm:@supabase\/supabase-js@2\.117\.3/);
  assert.match(source, /size > 16384/);
  assert.match(source, /return reply\(error instanceof RangeError \? 413 : 400/);
  assert.match(source, /Cache-Control.*no-store/);
  assert.match(source, /rollbackQuote\(quote, updated\.id\)/);
  assert.match(source, /serviceUpdated/);
  assert.match(source, /linked_service_not_found/);
});


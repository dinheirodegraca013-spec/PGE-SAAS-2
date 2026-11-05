import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('orçamento público fixa dependência e limita payloads', async () => {
  const source = await readFile('supabase/functions/public-orcamento/index.ts', 'utf8');
  assert.match(source, /npm:@supabase\/supabase-js@2\.119\.0/);
  assert.match(source, /size > 16384/);
  assert.match(source, /return reply\(req, error instanceof RangeError \? 413 : 400/);
  assert.match(source, /Cache-Control.*no-store/);
  assert.match(source, /X-Content-Type-Options.*nosniff/);
  assert.match(source, /Referrer-Policy.*no-referrer/);
  assert.match(source, /"Vary": "Origin"/);
  assert.match(source, /publicOrigin/);
  assert.doesNotMatch(source, /Access-Control-Allow-Origin.*\*'/);
  assert.match(source, /alternateOrigin/);
  assert.match(source, /allowedOrigins\.has\(requestOrigin\)/);
  assert.match(source, /rollbackQuote\(quote, updated\.id\)/);
  assert.match(source, /serviceUpdated/);
  assert.match(source, /linked_service_not_found/);
  assert.match(source, /req\.method !== "GET" && req\.method !== "POST"/);
  assert.match(source, /Método não permitido/);
  assert.match(source, /never expose the[\s\S]*internal service UUID/);
  assert.doesNotMatch(source, /id: row\.id, servico_id: row\.servico_id/);
});


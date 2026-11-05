import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'supabase/functions/cadastrar-funcionario/index.ts',
  'supabase/functions/public-orcamento/index.ts',
  'supabase/functions/validar-anexo/index.ts',
];

test('Edge Functions usam a mesma versão fixa do cliente Supabase', async () => {
  const sources = await Promise.all(files.map(file => readFile(file, 'utf8')));
  const versions = sources.map(source => source.match(/npm:@supabase\/supabase-js@(\d+\.\d+\.\d+)/)?.[1]);
  assert.deepEqual(versions, ['2.119.0', '2.119.0', '2.119.0']);
});

test('Edge Functions JSON não permitem sniffing nem vazamento de referenciador', async () => {
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /X-Content-Type-Options['\"]?\s*:/);
    assert.match(source, /nosniff/);
    assert.match(source, /Referrer-Policy['\"]?\s*:/);
    assert.match(source, /no-referrer/);
  }
});


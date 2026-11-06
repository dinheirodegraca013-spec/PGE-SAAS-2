import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/attachments.service.ts',import.meta.url),'utf8');

test('link temporário valida o caminho antes do Storage',()=>{
  assert.match(source,/if\(typeof path!==\'string\'\|\|!path\.trim\(\)\)throw new Error\('O caminho do anexo é inválido\.'\)/);
});

test('preparo de anexo valida contexto e arquivo antes da RPC',()=>{
  assert.match(source,/O serviço, setor ou arquivo do anexo é inválido/);
  assert.match(source,/Number\.isSafeInteger\(file\.size\)\|\|file\.size<=0/);
});


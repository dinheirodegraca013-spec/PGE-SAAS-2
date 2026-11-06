import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const installation=await readFile(new URL('../src/modules/workforce/services/installation.service.ts',import.meta.url),'utf8');
const pipeline=await readFile(new URL('../src/modules/workforce/services/pipeline.service.ts',import.meta.url),'utf8');

test('aceite de instalação valida serviço e versão antes da RPC',()=>{
  assert.match(installation,/typeof service!==\'string\'\|\|!service\.trim\(\)\|\|!Number\.isSafeInteger\(version\)\|\|version<1/);
  assert.match(installation,/input\.confirmed!==true/);
  assert.match(installation,/Os dados do aceite de instalação são inválidos/);
  assert.match(installation,/O aceite retornou dados inválidos/);
});

test('fluxo valida serviço e versões antes das RPCs',()=>{
  assert.match(pipeline,/if\(typeof service!==\'string\'\|\|!service\.trim\(\)\)throw new Error\('O serviço do fluxo é inválido\.'\)/);
  assert.match(pipeline,/!Number\.isSafeInteger\(version\)\|\|version<0/);
});

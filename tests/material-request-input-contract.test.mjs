import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/technical-sheet.service.ts',import.meta.url),'utf8');

test('solicitação de material valida dados antes da criação',()=>{
  assert.match(source,/Os dados da solicitação de material são inválidos/);
  assert.match(source,/Number\.isFinite\(input\.quantity\)\|\|input\.quantity<=0/);
});

test('atualização de material valida identificador e versão',()=>{
  assert.match(source,/typeof id!==\'string\'\|\|!id\.trim\(\).*Number\.isSafeInteger\(version\).*version<1/);
});


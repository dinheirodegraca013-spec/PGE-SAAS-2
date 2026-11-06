import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/access.service.ts',import.meta.url),'utf8');

test('consulta de funcionário valida o identificador antes da RPC',()=>{
  assert.match(source,/O identificador do funcionário é inválido/);
  assert.match(source,/if\(!isNonEmptyString\(userId\)\)/);
});

test('salvamento de acesso valida setor, permissões e versão antes da RPC',()=>{
  assert.match(source,/Os dados de acesso do funcionário são inválidos/);
  assert.match(source,/new Set\(input\.setores_adicionais\)\.size!==input\.setores_adicionais\.length/);
  assert.match(source,/Number\.isSafeInteger\(input\.versao\)\|\|input\.versao<1/);
});

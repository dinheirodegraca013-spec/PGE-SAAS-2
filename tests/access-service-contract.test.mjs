import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/access.service.ts',import.meta.url),'utf8');

test('validação de acesso rejeita permissões vazias e duplicadas',()=>{
  assert.match(source,/isNonEmptyString=\(value:unknown\)/);
  assert.match(source,/hasUniquePermissions=\(value:unknown\[\]\)/);
  assert.match(source,/row\.permissoes\.every\(isGrant\)&&hasUniquePermissions\(row\.permissoes\)/);
  assert.match(source,/row\.catalogo_permissoes\.every\(isCatalogItem\)&&hasUniquePermissions\(row\.catalogo_permissoes\)/);
});

test('setor principal não pode ser repetido nos setores adicionais',()=>{
  assert.match(source,/row\.setor===null\|\|row\.setores_adicionais\.every\(item=>item!==row\.setor\)/);
});


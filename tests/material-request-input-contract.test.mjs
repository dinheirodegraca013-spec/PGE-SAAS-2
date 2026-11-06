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

test('lista de solicitações valida serviço e setor antes do RPC',()=>{
  assert.match(source,/isServiceSector=\(service:unknown,sector:unknown\)/);
  assert.match(source,/if\(!isServiceSector\(service,sector\)\)throw new Error\('O serviço ou setor da ficha é inválido\.'\)/);
});

test('registro de produção valida dados antes da RPC',()=>{
  assert.match(source,/Os dados do registro de produção são inválidos/);
  assert.match(source,/input\.description\.trim\(\)\.length<3/);
});

test('salvamento da ficha valida contexto e payload antes da RPC',()=>{
  assert.match(source,/Os dados ou versão da ficha são inválidos/);
  assert.match(source,/Array\.isArray\(values\)/);
});


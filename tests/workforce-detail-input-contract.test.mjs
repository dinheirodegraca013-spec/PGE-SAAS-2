import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const attachments=await readFile(new URL('../src/modules/workforce/services/attachments.service.ts',import.meta.url),'utf8');
const incidents=await readFile(new URL('../src/modules/workforce/services/incidents.service.ts',import.meta.url),'utf8');

test('anexos validam serviço e setor antes da consulta',()=>{
  assert.match(attachments,/typeof service!==\'string\'\|\|!service\.trim\(\)\|\|typeof sector!==\'string\'\|\|!isSetor\(sector\)/);
});

test('ocorrências validam serviço e setor antes da consulta',()=>{
  assert.match(incidents,/typeof service!==\'string\'\|\|!service\.trim\(\)\|\|typeof sector!==\'string\'\|\|!isSetor\(sector\)/);
});

test('ocorrências validam criação e resolução antes das RPCs',()=>{
  assert.match(incidents,/Os dados da ocorrência são inválidos/);
  assert.match(incidents,/incident\.status!==\'aberta\'/);
  assert.match(incidents,/resolution\.trim\(\)\.length<3/);
});


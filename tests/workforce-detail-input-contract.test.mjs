import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const attachments=await readFile(new URL('../src/modules/workforce/services/attachments.service.ts',import.meta.url),'utf8');
const incidents=await readFile(new URL('../src/modules/workforce/services/incidents.service.ts',import.meta.url),'utf8');
const pipeline=await readFile(new URL('../src/modules/workforce/services/pipeline.service.ts',import.meta.url),'utf8');

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

test('ocorrências rejeitam textos e IDs vazios nas respostas',()=>{
  assert.match(incidents,/row\.id==='string'&&row\.id\.trim\(\)\.length>0/);
  assert.match(incidents,/row\.titulo==='string'&&row\.titulo\.trim\(\)\.length>0/);
  assert.match(incidents,/row\.descricao==='string'&&row\.descricao\.trim\(\)\.length>0/);
  assert.match(incidents,/String\(\(value as Record<string,unknown>\)\.id\)\.trim\(\)\.length>0/);
});

test('fluxo valida sequência de setores antes da gravação',()=>{
  assert.match(pipeline,/!Array\.isArray\(sectors\)/);
  assert.match(pipeline,/new Set\(sectors\)\.size!==sectors\.length/);
});

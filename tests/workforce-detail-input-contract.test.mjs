import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const attachments=await readFile(new URL('../src/modules/workforce/services/attachments.service.ts',import.meta.url),'utf8');
const incidents=await readFile(new URL('../src/modules/workforce/services/incidents.service.ts',import.meta.url),'utf8');
const pipeline=await readFile(new URL('../src/modules/workforce/services/pipeline.service.ts',import.meta.url),'utf8');
const notifications=await readFile(new URL('../src/modules/workforce/services/notifications.service.ts',import.meta.url),'utf8');
const agenda=await readFile(new URL('../src/modules/workforce/services/agenda.service.ts',import.meta.url),'utf8');

test('anexos validam serviço e setor antes da consulta',()=>{
  assert.match(attachments,/typeof service!==\'string\'\|\|!service\.trim\(\)\|\|typeof sector!==\'string\'\|\|!isSetor\(sector\)/);
});

test('anexos rejeitam metadados vazios e IDs duplicados',()=>{
  assert.match(attachments,/row\.id==='string'&&row\.id\.trim\(\)\.length>0/);
  assert.match(attachments,/row\.caminho==='string'&&row\.caminho\.trim\(\)\.length>0/);
  assert.match(attachments,/new Set\(row\.itens\.map\(item => item\.id\)\)\.size!==row\.itens\.length/);
  assert.match(attachments,/String\(\(value as Record<string,unknown>\)\.id\)\.trim\(\)\.length>0/);
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

test('agenda e notificações rejeitam identificadores vazios',()=>{
  assert.match(notifications,/row\.id==='string'&&row\.id\.trim\(\)\.length>0/);
  assert.match(notifications,/row\.servico_id==='string'&&row\.servico_id\.trim\(\)\.length>0/);
  assert.match(agenda,/row\.id==='string'&&row\.id\.trim\(\)\.length>0/);
  assert.match(agenda,/row\.titulo==='string'&&row\.titulo\.trim\(\)\.length>0/);
});

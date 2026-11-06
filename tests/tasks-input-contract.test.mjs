import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/tasks.service.ts',import.meta.url),'utf8');

test('criação de tarefa valida contexto e campos antes da RPC',()=>{
  assert.match(source,/Os dados da tarefa são inválidos/);
  assert.match(source,/!isSetor\(input\.sector\)/);
  assert.match(source,/input\.title\.trim\(\)\.length<2/);
});

test('atualização de tarefa valida identificador, status e progresso antes da RPC',()=>{
  assert.match(source,/Os dados da atualização da tarefa são inválidos/);
  assert.match(source,/!isTaskStatus\(status\)/);
  assert.match(source,/!Number\.isInteger\(progress\)\|\|progress<0\|\|progress>100/);
});

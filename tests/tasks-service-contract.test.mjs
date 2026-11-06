import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/tasks.service.ts',import.meta.url),'utf8');

test('lista de tarefas valida página e filtro antes da RPC',()=>{
  assert.match(source,/if\(!Number\.isSafeInteger\(page\)\|\|page<0\)throw new Error\('A página de tarefas é inválida\.'\)/);
  assert.match(source,/if\(status!==null&&!isTaskStatus\(status\)\)throw new Error\('O filtro de tarefas é inválido\.'\)/);
});

test('lista de tarefas rejeita IDs duplicados na mesma página',()=>{
  assert.match(source,/new Set\(row\.itens\.map\(item=>item\.id\)\)\.size===row\.itens\.length/);
});

test('lista de tarefas rejeita identificadores e títulos vazios',()=>{
  assert.match(source,/typeof row\.id==='string'&&row\.id\.trim\(\)\.length>0/);
  assert.match(source,/typeof row\.titulo==='string'&&row\.titulo\.trim\(\)\.length>0/);
});

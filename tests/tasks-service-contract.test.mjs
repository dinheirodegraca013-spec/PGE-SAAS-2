import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/tasks.service.ts',import.meta.url),'utf8');

test('lista de tarefas valida página e filtro antes da RPC',()=>{
  assert.match(source,/if\(!Number\.isSafeInteger\(page\)\|\|page<0\)throw new Error\('A página de tarefas é inválida\.'\)/);
  assert.match(source,/if\(status!==null&&!isTaskStatus\(status\)\)throw new Error\('O filtro de tarefas é inválido\.'\)/);
});


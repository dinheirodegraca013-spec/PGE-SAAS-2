import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/tasks.service.ts',import.meta.url),'utf8');

test('carregamento de tarefa valida o identificador antes da RPC',()=>{
  assert.match(source,/if\(typeof id!=='string'\|\|!id\.trim\(\)\)throw new Error\('A tarefa é inválida\.'\)/);
});


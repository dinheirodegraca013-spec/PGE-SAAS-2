import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/technical-sheet.service.ts',import.meta.url),'utf8');

test('fila de estoque valida filtro e ação antes das RPCs',()=>{
  assert.match(source,/if\(status!==null&&!materialStatuses\.includes\(status\)\)throw new Error\('O filtro de solicitações é inválido\.'\)/);
  assert.match(source,/!\['cancelar','aprovar','recusar','atender'\]\.includes\(action\)/);
});


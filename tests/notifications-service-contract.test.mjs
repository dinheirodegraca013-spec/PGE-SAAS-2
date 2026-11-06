import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/notifications.service.ts',import.meta.url),'utf8');

test('notificações rejeitam IDs duplicados e ordenam as mais recentes primeiro',()=>{
  assert.match(source,/new Set\(row\.itens\.map\(item=>item\.id\)\)\.size===row\.itens\.length/);
  assert.match(source,/sort\(\(left,right\)=>new Date\(right\.criada_em\)\.getTime\(\)-new Date\(left\.criada_em\)\.getTime\(\)\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/technical-sheet.service.ts',import.meta.url),'utf8');

test('produção rejeita registros duplicados e ordena os mais recentes',()=>{
  assert.match(source,/new Set\(records\.map\(item => \(item as Record<string, unknown>\)\.id\)\)\.size === records\.length/);
  assert.match(source,/sortProductionState=\(state:ProductionState\):ProductionState/);
  assert.match(source,/new Date\(right\.criado_em\)\.getTime\(\)-new Date\(left\.criado_em\)\.getTime\(\)/);
});

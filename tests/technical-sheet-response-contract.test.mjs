import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/technical-sheet.service.ts',import.meta.url),'utf8');

test('ficha técnica rejeita textos vazios ou apenas espaços',()=>{
  assert.match(source,/typeof row\.servico_id === 'string' && row\.servico_id\.trim\(\)\.length>0/);
  assert.match(source,/modelRecord\.titulo\.trim\(\)\.length>0/);
  assert.match(source,/item\.trim\(\)\.length>0/);
  assert.match(source,/String\(\(item as Record<string, unknown>\)\.key\)\.trim\(\)\.length>0/);
});

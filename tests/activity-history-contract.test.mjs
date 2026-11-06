import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/components/MyActivityHistory.tsx',import.meta.url),'utf8');

test('histórico rejeita setor ausente em resposta incompleta',()=>{
  assert.match(source,/const setor=row\.setor===null\|\|typeof row\.setor==='string'&&isSetor\(row\.setor\)/);
  assert.match(source,/setor:row\.setor===null\?null:row\.setor/);
});

test('histórico rejeita IDs duplicados e ordena as atividades recentes',()=>{
  assert.match(source,/new Set\(validItens\.map\(item=>item\.id\)\)\.size!==validItens\.length/);
  assert.match(source,/validItens\.sort\(\(left,right\)=>new Date\(right\.created_at\)\.getTime\(\)-new Date\(left\.created_at\)\.getTime\(\)\)/);
});

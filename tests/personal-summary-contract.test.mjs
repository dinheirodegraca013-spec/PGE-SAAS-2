import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/components/PersonalWorkSummary.tsx',import.meta.url),'utf8');

test('resumo rejeita prazo com setor desconhecido',()=>{
  assert.match(source,/import \{isSetor\} from '@\/lib\/setores'/);
  assert.match(source,/typeof row\.setor!=='string'\|\|!isSetor\(row\.setor\)/);
});

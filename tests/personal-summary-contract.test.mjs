import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/components/PersonalWorkSummary.tsx',import.meta.url),'utf8');

test('resumo foca e posiciona a tarefa encontrada ao abrir o prazo',()=>{
  assert.match(source,/target\.setAttribute\('tabindex','-1'\)/);
  assert.match(source,/target\.focus\(\{preventScroll:true\}\)/);
  assert.match(source,/target\.scrollIntoView\(\{behavior:'smooth',block:'center'\}\)/);
  assert.match(source,/list\.setAttribute\('tabindex','-1'\);list\.focus\(\{preventScroll:true\}\);list\.scrollIntoView\(\{behavior:'smooth',block:'start'\}\)/);
});

test('resumo rejeita prazo com setor desconhecido',()=>{
  assert.match(source,/import \{isSetor\} from '@\/lib\/setores'/);
  assert.match(source,/typeof row\.setor!=='string'\|\|!isSetor\(row\.setor\)/);
  assert.match(source,/Number\.isFinite\(new Date\(row\.prazo\)\.getTime\(\)\)/);
  assert.match(source,/new Set\(validPrazos\.map\(item=>item\.id\)\)\.size!==validPrazos\.length/);
  assert.match(source,/validPrazos\.sort\(\(left,right\)=>new Date\(left\.prazo\)\.getTime\(\)-new Date\(right\.prazo\)\.getTime\(\)\)/);
});

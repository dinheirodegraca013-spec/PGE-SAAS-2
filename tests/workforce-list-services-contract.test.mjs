import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const notifications=await readFile(new URL('../src/modules/workforce/services/notifications.service.ts',import.meta.url),'utf8');
const sheets=await readFile(new URL('../src/modules/workforce/services/technical-sheet.service.ts',import.meta.url),'utf8');

test('notificações rejeitam paginação inválida antes da RPC',()=>{
  assert.match(notifications,/if\(!Number\.isSafeInteger\(page\)\|\|page<0\)throw new Error\('A página de notificações é inválida\.'\)/);
});

test('fichas rejeitam página inválida e pesquisa não textual antes da RPC',()=>{
  assert.match(sheets,/if\(!Number\.isSafeInteger\(page\)\|\|page<0\)throw new Error\('A página de fichas é inválida\.'\)/);
  assert.match(sheets,/if\(typeof search!=='string'\)throw new Error\('A pesquisa de fichas é inválida\.'\)/);
});

test('fichas rejeitam duplicatas e ordenam pela atualização mais recente',()=>{
  assert.match(sheets,/new Set\(validItens\.map\(item=>`\$\{item\.servico_id\}:\$\{item\.setor\}`\)\)\.size!==validItens\.length/);
  assert.match(sheets,/validItens\.sort\(\(left,right\)=>new Date\(right\.atualizado_em\)\.getTime\(\)-new Date\(left\.atualizado_em\)\.getTime\(\)\)/);
});

test('opções de material exigem textos identificáveis e IDs únicos',()=>{
  assert.match(sheets,/row\.id\.trim\(\)\.length>0/);
  assert.match(sheets,/new Set\(options\.map\(item=>item\.id\)\)\.size!==options\.length/);
  assert.match(sheets,/sort\(\(left,right\)=>left\.nome\.localeCompare\(right\.nome,'pt-BR'\)\)/);
});

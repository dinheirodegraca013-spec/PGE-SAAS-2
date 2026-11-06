import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const attachments=await readFile(new URL('../src/modules/workforce/services/attachments.service.ts',import.meta.url),'utf8');
const incidents=await readFile(new URL('../src/modules/workforce/services/incidents.service.ts',import.meta.url),'utf8');

test('anexos rejeitam paginação inválida antes da RPC',()=>{
  assert.match(attachments,/if\(!Number\.isSafeInteger\(page\)\|\|page<0\)throw new Error\('A página de anexos é inválida\.'\)/);
});

test('ocorrências rejeitam paginação inválida antes da RPC',()=>{
  assert.match(incidents,/if\(!Number\.isSafeInteger\(page\)\|\|page<0\)throw new Error\('A página de ocorrências é inválida\.'\)/);
});

test('ocorrências rejeitam IDs duplicados na mesma página',()=>{
  assert.match(incidents,/new Set\(row\.itens\.map\(item=>item\.id\)\)\.size!==row\.itens\.length/);
});

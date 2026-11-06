import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/attachments.service.ts',import.meta.url),'utf8');

test('upload valida recibo e arquivo antes do Storage',()=>{
  assert.match(source,/O arquivo ou recibo do anexo é inválido/);
  assert.match(source,/!isUploadReceipt\(receipt\)/);
  assert.match(source,/Number\.isSafeInteger\(file\.size\)\|\|file\.size<=0/);
});

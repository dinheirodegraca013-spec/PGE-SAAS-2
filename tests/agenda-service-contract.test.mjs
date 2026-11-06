import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/modules/workforce/services/agenda.service.ts',import.meta.url),'utf8');

test('agenda valida datas de calendário antes da RPC',()=>{
  assert.match(source,/const isCalendarDate=\(value:unknown\)/);
  assert.match(source,/if\(!isCalendarDate\(start\)\|\|!isCalendarDate\(end\)\|\|end<start\)/);
});


import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(path));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) result.push(path);
  }
  return result;
}

test('frontend e Edge Functions não introduzem sinks HTML executáveis', async () => {
  const files = [
    ...await filesIn(fileURLToPath(new URL('../src', import.meta.url))),
    ...await filesIn(fileURLToPath(new URL('../supabase/functions', import.meta.url))),
  ];
  const unsafe = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (/dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML|\beval\s*\(|new Function\s*\(/.test(source)) unsafe.push(file);
  }
  assert.deepEqual(unsafe, []);
});


import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('vercel preserva o rewrite da SPA e declara Permissions-Policy restritiva', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
  const headers = config.headers.flatMap((entry) => entry.headers ?? []);
  const policy = headers.find((header) => header.key.toLowerCase() === 'permissions-policy');
  assert.equal(policy?.value, 'camera=(), microphone=(), geolocation=()');
});

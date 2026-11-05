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

test('CSP impede embedding e envio de formulários para outra origem', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const headers = config.headers.flatMap((entry) => entry.headers ?? []);
  const csp = headers.find((header) => header.key.toLowerCase() === 'content-security-policy')?.value ?? '';
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /frame-src 'none'/);
  assert.match(csp, /form-action 'self'/);
});

test('Supabase exige JWT no cadastro de funcionários e mantém orçamento público explícito', async () => {
  const config = await readFile(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  assert.match(config, /\[functions\.cadastrar-funcionario\][\s\S]*verify_jwt\s*=\s*true/);
  assert.match(config, /\[functions\.public-orcamento\][\s\S]*verify_jwt\s*=\s*false/);
});


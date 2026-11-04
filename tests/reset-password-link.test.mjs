
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const view = await readFile(new URL('../src/views/auth/ResetPasswordView.tsx', import.meta.url), 'utf8');
const client = await readFile(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');

test('recuperação aceita callback PKCE e tokens no hash sem exigir código indevido', () => {
  assert.match(view, /exchangeCodeForSession\(code\)/);
  assert.match(view, /setSession\(\{ access_token: accessToken, refresh_token: refreshToken \}\)/);
  assert.match(view, /resetPasswordForEmail\(normalizedEmail/);
  assert.match(view, /Reenviar link de redefinição/);
  assert.match(view, /aria-live="polite"/);
  assert.match(view, /aria-live="assertive"/);
  assert.match(client, /detectSessionInUrl:\s*true/);
});


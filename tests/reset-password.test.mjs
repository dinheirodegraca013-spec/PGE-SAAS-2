import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import React from 'react';

const { code } = await transform(await readFile(new URL('../src/views/auth/ResetPasswordView.tsx', import.meta.url), 'utf8'), { loader: 'tsx', format: 'cjs', jsx: 'transform' });
function setup(password, { link = false, expired = false } = {}) {
  const values = [link ? '' : 'employee@example.com', link ? '' : '123456', password, password, false, false, null, link, false];
  const changes = [], calls = [];
  let index = 0;
  const react = { ...React, useEffect() {}, useState(initial) { const key = index++; return [key < values.length ? values[key] : initial, value => changes.push([key, value])]; } };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'react') return { __esModule: true, default: react, ...react };
    if (name === 'react-router-dom') return { Link: () => null, useNavigate: () => () => {}, useSearchParams: () => [new URLSearchParams()] };
    if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (name === '@/lib/supabase') return { supabase: { auth: {
      async verifyOtp() { calls.push('verify'); return { error: { message: 'mock stops before session' } }; },
      async getSession() { calls.push('session'); return { data: { session: expired ? null : { user: { email: 'employee@example.com' } } }, error: null }; },
      async updateUser() { calls.push('update'); return { error: { message: 'Simulated network error' } }; },
    } } };
    throw new Error(`Unexpected module: ${name}`);
  }, module, module.exports);
  function find(node, predicate = node => node.type === 'form') {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, predicate); if (found) return found; }
    return null;
  }
  const tree = module.exports.default();
  return { form: find(tree), calls, changes, codeInput: find(tree, node => node.props?.id === 'codigoRecuperacao') };
}
test('senha acima de 72 bytes não consome o código de recuperação', async () => {
  for (const password of ['A'.repeat(73), 'á'.repeat(37)]) {
    const s = setup(password);
    await s.form.props.onSubmit({ preventDefault() {} });
    assert.deepEqual(s.calls, []);
    assert.ok(s.changes.some(([, value]) => typeof value === 'string' && value.includes('72')));
  }
});
test('link validado não exige e-mail ou código e usa a sessão para salvar a senha', async () => {
  const s = setup('StrongPassword1!', { link: true });
  assert.equal(s.codeInput, null);
  await s.form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(s.calls, ['session', 'update']);
  assert.ok(s.changes.some(([key, value]) => key === 4 && value === false));
});
test('sessão expirada não permite atualizar senha', async () => {
  const s = setup('StrongPassword1!', { link: true, expired: true });
  await s.form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(s.calls, ['session']);
  assert.ok(s.changes.some(([, value]) => typeof value === 'string' && value.includes('expirou')));
});
test('senhas de até 72 bytes seguem para validação do código', async () => {
  for (const password of ['A'.repeat(72), 'á'.repeat(36)]) {
    const s = setup(password);
    await s.form.props.onSubmit({ preventDefault() {} });
    assert.deepEqual(s.calls, ['verify']);
  }
});

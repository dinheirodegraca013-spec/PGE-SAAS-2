
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('rotas operacionais permanecem dentro do RequireAuth', () => {
  const start = app.indexOf('path="/"');
  const end = app.indexOf('DASHBOARD ADMINISTRATIVO');
  const panel = app.slice(start, end);
  assert.match(panel, /<RequireAuth>/);
  for (const route of ['estoque', 'visao-3d', 'equipe', 'meu-setor', 'meu-financeiro']) {
    assert.match(panel, new RegExp(`path="${route}"`));
  }
});

test('rotas administrativas não removem os guards de privilégio', () => {
  const admin = app.slice(app.indexOf('path="/admin"'), app.indexOf('path="/financeiro"'));
  assert.match(admin, /<AdminGuard requireSuperAdmin>/);
  assert.match(admin, /<FinanceiroGuard>/);
});


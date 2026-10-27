import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../src/layouts/navigation.ts', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('../src/views/dashboard/DashboardView.tsx', import.meta.url), 'utf8');
const readOptional = (path) => fs.existsSync(new URL(path, import.meta.url)) ? fs.readFileSync(new URL(path, import.meta.url), 'utf8') : '';
const visao = readOptional('../src/views/visao3d/Visao3DView.tsx');
const equipe = readOptional('../src/views/equipe/EquipeView.tsx');

test('rotas autenticadas incluem Visão 3D e Equipe', () => {
  assert.match(app, /path="visao-3d"/);
  assert.match(app, /path="equipe"/);
});

test('menu lateral aponta para Visão 3D e Equipe', () => {
  assert.match(nav, /path: '\/visao-3d'/);
  assert.match(nav, /path: '\/equipe'/);
});

test('visão operacional não incorpora os números demonstrativos do protótipo', () => {
  assert.doesNotMatch(visao, /R\$\s*10\.550|MDF 18mm \(chapa\).*6 de 10/);
  assert.match(visao, /estoque_itens|projetosService/);
});

test('equipe consulta profiles do tenant e explicita presença não registrada', () => {
  assert.match(equipe, /from\('profiles'\)/);
  assert.match(equipe, /Presença não registrada/);
});

test('dashboard oferece resumo para Visão 3D e Equipe', () => {
  assert.match(dashboard, /to="\/visao-3d"/);
  assert.match(dashboard, /to="\/equipe"/);
});

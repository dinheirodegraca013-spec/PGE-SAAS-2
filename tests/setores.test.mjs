import test from 'node:test';
import assert from 'node:assert/strict';
import { caminhoPermitido, podeCadastrarFuncionario, isSetor } from '../src/lib/setores.ts';

test('somente o administrador da empresa cadastra funcionários', () => {
  assert.equal(podeCadastrarFuncionario('AdministradorTenant'), true);
  for (const papel of ['Instalador','Financeiro','Estoque','SuperAdmin',undefined]) assert.equal(podeCadastrarFuncionario(papel), false);
});
test('funcionário acessa seu painel e somente o módulo correspondente', () => {
  for (const setor of ['corte','montagem','acabamento','instalacao','estoque','financeiro']) {
    assert.equal(caminhoPermitido(setor, '/meu-setor'), true);
    for (const path of ['/equipe','/configuracoes','/projetos','/clientes','/','/meu-setor/qualquer']) assert.equal(caminhoPermitido(setor, path), false);
    assert.equal(caminhoPermitido(setor, '/estoque'), setor === 'estoque');
    assert.equal(caminhoPermitido(setor, '/meu-financeiro'), setor === 'financeiro');
  }
  assert.equal(caminhoPermitido(null, '/equipe'), true);
});
test('setores inválidos não abrem módulos e não incluem propriedades herdadas', () => {
  for (const value of ['constructor','toString','admin','',null,undefined]) assert.equal(isSetor(value), false);
  assert.equal(caminhoPermitido('admin','/meu-financeiro'), false);
});

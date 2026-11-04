import test from 'node:test';
import assert from 'node:assert/strict';
import { mensagemErroFuncao } from '../src/services/api/function-errors.ts';

test('preserva o motivo retornado pela função HTTP', async () => {
  const response = new Response(JSON.stringify({ error: 'O e-mail já está cadastrado.' }), { status: 409 });
  assert.equal(await mensagemErroFuncao({ context: response }, 'Falha genérica.'), 'O e-mail já está cadastrado.');
  assert.equal(response.bodyUsed, false);
});
test('falhas de rede e respostas inválidas usam mensagem segura', async () => {
  for (const error of [null, new Error('Internal details'), { context: new Response('<html>Gateway error</html>') }, { context: new Response(JSON.stringify({ error: 123 })) }]) {
    assert.equal(await mensagemErroFuncao(error, 'Tente novamente.'), 'Tente novamente.');
  }
});
test('resposta já consumida não esconde o erro com outra exceção', async () => {
  const response = new Response('{}'); await response.text();
  assert.equal(await mensagemErroFuncao({ context: response }, 'Tente novamente.'), 'Tente novamente.');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import React from 'react';

// Exercise the real rendered form handler with mocked API boundaries, without payments.
const { code } = await transform(await readFile(new URL('../src/views/financeiro/FinanceiroEmpresaView.tsx', import.meta.url), 'utf8'), { loader: 'tsx', format: 'cjs', jsx: 'transform' });
function setup({ project = 'project-a', failure = false } = {}) {
  const values = [ [{ id: 'project-a', titulo: 'Cozinha', status: 4, valorTotalOrcamento: 100 }], false, null, null, '', 'painel', [], true, 'receita', 'Primeira parcela', '39,90', '2026-12-01', project, '', false, 0, 0 ];
  let index = 0;
  const changes = [];
  const calls = [];
  const react = { ...React, useState(initial) { const key = index++; return [key < values.length ? values[key] : initial, value => changes.push([key, value])]; }, useEffect() {}, useMemo(fn) { return fn(); } };
  const supabase = {
    async rpc(name, args) {
      calls.push([name, args]);
      if (name === 'financeiro_criar_lancamento') { if (failure) throw new Error('Network failed'); return { error: null }; }
      return { data: [{ receitas: 0, despesas: 0 }], error: null };
    },
    from() { return { select() { return this; }, order() { return this; }, async eq() { return { data: [], error: null }; } }; },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'react') return { __esModule: true, default: react, ...react };
    if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (name === '@/lib/supabase') return { supabase };
    if (name.includes('WorkforceAccessContext')) return { useWorkforceAccess:()=>({context:{proprietario:true,permissoes:[{modulo:'financeiro',operacao:'criar'},{modulo:'financeiro',operacao:'visualizar'},{modulo:'financeiro',operacao:'relatorios'},{modulo:'financeiro',operacao:'exportar'},{modulo:'financeiro',operacao:'registrar_pagamento'},{modulo:'financeiro',operacao:'registrar_recebimento'}]}}) };
    if (name.includes('workforce/lib/access')) return { hasPermission:(ctx,module,op='visualizar')=>ctx.permissoes.some(p=>p.modulo===module&&p.operacao===op) };
    if (name === '@/services/api/client') return { getCurrentTenantId: () => 'tenant-a' };
    if (name.includes('projetos.service')) return { projetosService: { listar: async () => ({ succeeded: true, value: { items: values[0] } }) } };
    if (name.includes('FinancialCalendar')) return { __esModule: true, default: () => null };
    throw new Error(`Unexpected module: ${name}`);
  }, module, module.exports);
  const tree = module.exports.default();
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  return { calls, changes, form: find(tree, node => node.type === 'form') };
}
test('envia valor brasileiro e projeto selecionado para a RPC real do formulário', async () => {
  const s = setup(); await s.form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(s.calls[0], ['financeiro_criar_lancamento', { p_tipo: 'receita', p_descricao: 'Primeira parcela', p_valor: 39.9, p_vencimento: '2026-12-01', p_projeto_id: 'project-a' }]);
  assert.ok(s.changes.some(([key,value]) => key === 12 && value === ''));
});
test('lançamento geral envia projeto nulo e seleção indisponível não faz gravação', async () => {
  const general = setup({ project: '' }); await general.form.props.onSubmit({ preventDefault() {} }); assert.equal(general.calls[0][1].p_projeto_id, null);
  const invalid = setup({ project: 'another-tenant-project' }); await invalid.form.props.onSubmit({ preventDefault() {} }); assert.equal(invalid.calls.length, 0);
});
test('falha de rede libera nova tentativa e mantém os campos preenchidos', async () => {
  const s = setup({ failure: true }); await s.form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(s.changes.filter(([key]) => key === 14).map(([,value]) => value), [true, false]);
  assert.equal(s.changes.some(([key]) => [9,10,12].includes(key)), false);
  assert.ok(s.changes.some(([key,value]) => key === 13 && typeof value === 'string' && value.length > 0));
});

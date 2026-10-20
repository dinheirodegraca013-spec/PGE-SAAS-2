import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Item = { id: string; nome: string; codigo: string | null; unidade: string; estoque_minimo: number };
type Movimento = { item_id: string; tipo: string; quantidade: number };

export default function EstoqueView() {
  const [itens, setItens] = useState<Item[]>([]);
  const [saldos, setSaldos] = useState<Record<string, number>>({});
  const [erro, setErro] = useState('');
  const [operando, setOperando] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    setErro('');
    const itensResult = await supabase.from('estoque_itens').select('id,nome,codigo,unidade,estoque_minimo').order('nome');
    if (itensResult.error) {
      setErro('Estoque indisponível: verifique a migração e as permissões do banco.');
      setCarregando(false);
      return;
    }
    const movimentosResult = await supabase.from('estoque_movimentacoes').select('item_id,tipo,quantidade');
    if (movimentosResult.error) {
      setErro('Não foi possível consultar as movimentações.');
      setCarregando(false);
      return;
    }
    const rows = (itensResult.data || []) as Item[];
    const saldosNovos: Record<string, number> = {};
    for (const item of rows) saldosNovos[item.id] = 0;
    for (const mov of (movimentosResult.data || []) as Movimento[]) {
      if (!(mov.item_id in saldosNovos)) continue;
      saldosNovos[mov.item_id] += (mov.tipo === 'entrada' || mov.tipo === 'ajuste_entrada' ? 1 : -1) * Number(mov.quantidade);
    }
    setItens(rows);
    setSaldos(saldosNovos);
    setCarregando(false);
  }

  useEffect(() => { void carregar(); }, []);

  async function registrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!itemSelecionado || !motivo.trim() || !Number.isFinite(Number(quantidade)) || Number(quantidade) <= 0) {
      setErro('Preencha item, quantidade positiva e motivo.');
      return;
    }
    setOperando(true);
    setErro('');
    setMensagem('');
    const result = await supabase.rpc('estoque_registrar_movimento', {
      p_item_id: itemSelecionado, p_tipo: tipo, p_quantidade: Number(quantidade),
      p_motivo: motivo.trim(), p_projeto_id: null,
    });
    setOperando(false);
    if (result.error) {
      setErro('Movimentação não registrada. Verifique permissões, saldo e migração do banco.');
      return;
    }
    setMensagem('Movimentação registrada.');
    setQuantidade('');
    setMotivo('');
    await carregar();
  }

  return <main className="space-y-5 pb-8">
    <header className="flex items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Estoque</h1><p className="text-sm text-slate-500">Consulta de itens e movimentações reais — somente leitura.</p></div>
      <button type="button" onClick={() => void carregar()} disabled={carregando} className="rounded-lg border px-4 py-2">Atualizar</button>
    </header>
    {mensagem && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">{mensagem}</p>}
    <form onSubmit={registrar} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
      <h2 className="font-bold sm:col-span-2">Registrar movimentação</h2>
      <label className="text-sm">Item<select required value={itemSelecionado} onChange={e => setItemSelecionado(e.target.value)} className="block w-full rounded border p-2"><option value="">Selecione</option>{itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></label>
      <label className="text-sm">Tipo<select value={tipo} onChange={e => setTipo(e.target.value)} className="block w-full rounded border p-2"><option value="entrada">Entrada</option><option value="saida">Saída</option><option value="ajuste_entrada">Ajuste positivo</option><option value="ajuste_saida">Ajuste negativo</option></select></label>
      <label className="text-sm">Quantidade<input required type="number" min="0.001" step="0.001" value={quantidade} onChange={e => setQuantidade(e.target.value)} className="block w-full rounded border p-2" /></label>
      <label className="text-sm">Motivo<input required maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} className="block w-full rounded border p-2" /></label>
      <button disabled={operando || carregando || !!erro || itens.length === 0} type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50 sm:col-span-2">{operando ? 'Registrando...' : 'Registrar'}</button>
      <p className="text-xs text-slate-500 sm:col-span-2">Operação disponível somente após a migração transacional e autorização no banco de homologação.</p>
    </form>
    {erro && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{erro}</p>}
    {carregando ? <p>Carregando...</p> : !erro && (itens.length === 0 ? <p>Nenhum item cadastrado.</p> :
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr><th className="p-3">Item</th><th className="p-3">Código</th><th className="p-3">Saldo estimado</th><th className="p-3">Estoque mínimo</th></tr></thead>
        <tbody>{itens.map(item => <tr key={item.id} className="border-t">
          <td className="p-3">{item.nome}</td><td className="p-3">{item.codigo || '—'}</td>
          <td className="p-3">{(saldos[item.id] || 0).toLocaleString('pt-BR')} {item.unidade}</td>
          <td className="p-3">{Number(item.estoque_minimo).toLocaleString('pt-BR')}</td>
        </tr>)}</tbody>
      </table></div>)}
    <p className="text-xs text-slate-500">Saldos estimados a partir dos registros retornados; sujeitos ao limite de linhas do Supabase. Não utilizar para fechamento ou baixa de estoque.</p>
  </main>;
}

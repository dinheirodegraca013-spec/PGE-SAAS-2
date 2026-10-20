import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Item = { id: string; nome: string; codigo: string | null; unidade: string; estoque_minimo: number };
type Movimento = { item_id: string; tipo: string; quantidade: number };

export default function EstoqueView() {
  const [itens, setItens] = useState<Item[]>([]);
  const [saldos, setSaldos] = useState<Record<string, number>>({});
  const [erro, setErro] = useState('');
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

  return <main className="space-y-5 pb-8">
    <header className="flex items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Estoque</h1><p className="text-sm text-slate-500">Consulta de itens e movimentações reais — somente leitura.</p></div>
      <button type="button" onClick={() => void carregar()} disabled={carregando} className="rounded-lg border px-4 py-2">Atualizar</button>
    </header>
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

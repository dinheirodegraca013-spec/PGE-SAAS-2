import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Item = { id: string; nome: string; codigo: string | null; unidade: string; estoque_minimo: number; saldo: number };
type Projeto = { id: string; titulo: string | null; nome: string | null };

export default function EstoqueView() {
  const [itens, setItens] = useState<Item[]>([]);
  const [novoNome,setNovoNome] = useState('');
  const [novoCodigo,setNovoCodigo] = useState('');
  const [novoMinimo,setNovoMinimo] = useState('0');
  const [erro, setErro] = useState('');
  const [operando, setOperando] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState('');
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    setErro('');
    const itensResult = await supabase.from('estoque_itens').select('id,nome,codigo,unidade,estoque_minimo,saldo').order('nome');
    if (itensResult.error) {
      setErro('Estoque indisponível: verifique a migração e as permissões do banco.');
      setCarregando(false);
      return;
    }
    setItens((itensResult.data || []) as Item[]);
    const projetosResult = await supabase.from('projetos_marcenaria').select('id,titulo,nome').order('created_at', { ascending: false });
    if (!projetosResult.error) setProjetos((projetosResult.data || []) as Projeto[]);
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
      p_motivo: motivo.trim(), p_projeto_id: projetoSelecionado || null,
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
      <div><h1 className="text-2xl font-bold">Estoque</h1><p className="text-sm text-slate-500">Consulte saldos e registre entradas, saídas e ajustes autorizados.</p></div>
      <button type="button" onClick={() => void carregar()} disabled={carregando} className="rounded-lg border px-4 py-2">Atualizar</button>
    </header>
    <form className="rounded-xl border p-4 grid gap-3 sm:grid-cols-4" onSubmit={async e => {e.preventDefault();setOperando(true);setErro('');const {error}=await supabase.rpc('estoque_cadastrar_item',{p_nome:novoNome,p_codigo:novoCodigo||null,p_unidade:'un',p_estoque_minimo:Number(novoMinimo)});setOperando(false);if(error){setErro(error.message);return;}setNovoNome('');setNovoCodigo('');setNovoMinimo('0');setMensagem('Produto cadastrado.');await carregar();}}><h2 className="font-bold sm:col-span-4">Cadastrar produto</h2><input aria-label="Nome do produto" placeholder="Nome do produto" required value={novoNome} onChange={e=>setNovoNome(e.target.value)} className="rounded border p-2"/><input aria-label="Código" placeholder="Código (opcional)" value={novoCodigo} onChange={e=>setNovoCodigo(e.target.value)} className="rounded border p-2"/><input aria-label="Estoque mínimo" type="number" min="0" step="0.001" value={novoMinimo} onChange={e=>setNovoMinimo(e.target.value)} className="rounded border p-2"/><button disabled={operando} className="rounded bg-slate-900 p-2 text-white">Cadastrar</button></form>
    {mensagem && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">{mensagem}</p>}
    <form onSubmit={registrar} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
      <h2 className="font-bold sm:col-span-2">Registrar movimentação</h2>
      <label className="text-sm">Item<select required value={itemSelecionado} onChange={e => setItemSelecionado(e.target.value)} className="block w-full rounded border p-2"><option value="">Selecione</option>{itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></label>
      <label className="text-sm">Tipo<select value={tipo} onChange={e => setTipo(e.target.value)} className="block w-full rounded border p-2"><option value="entrada">Entrada</option><option value="saida">Saída</option><option value="ajuste_entrada">Ajuste positivo</option><option value="ajuste_saida">Ajuste negativo</option></select></label>
      <label className="text-sm">Quantidade<input required type="number" min="0.001" step="0.001" value={quantidade} onChange={e => setQuantidade(e.target.value)} className="block w-full rounded border p-2" /></label>
      <label className="text-sm">Motivo<input required maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} className="block w-full rounded border p-2" /></label>
      <label className="text-sm sm:col-span-2">Projeto relacionado (opcional)<select value={projetoSelecionado} onChange={e => setProjetoSelecionado(e.target.value)} className="block w-full rounded border p-2"><option value="">Movimentação geral</option>{projetos.map(p => <option key={p.id} value={p.id}>{p.titulo || p.nome || p.id}</option>)}</select></label>
      <button disabled={operando || carregando || itens.length === 0} type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50 sm:col-span-2">{operando ? 'Registrando...' : 'Registrar'}</button>
      <p className="text-xs text-slate-500 sm:col-span-2">As movimentações exigem permissão de estoque e são registradas no banco.</p>
    </form>
    {erro && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{erro}</p>}
    {carregando ? <p>Carregando...</p> : !erro && (itens.length === 0 ? <p>Nenhum item cadastrado.</p> :
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr><th className="p-3">Item</th><th className="p-3">Código</th><th className="p-3">Saldo</th><th className="p-3">Estoque mínimo</th></tr></thead>
        <tbody>{itens.map(item => <tr key={item.id} className="border-t">
          <td className="p-3">{item.nome}</td><td className="p-3">{item.codigo || '—'}</td>
          <td className="p-3">{Number(item.saldo).toLocaleString('pt-BR')} {item.unidade}</td>
          <td className="p-3">{Number(item.estoque_minimo).toLocaleString('pt-BR')}</td>
        </tr>)}</tbody>
      </table></div>)}
    <p className="text-xs text-slate-500">Saldos mantidos transacionalmente no banco.</p>
  </main>;
}

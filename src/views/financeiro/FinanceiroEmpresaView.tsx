import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CircleAlert, RefreshCw, Wallet, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { projetosService } from '@/modules/furniture/services/projetos.service';
import type { ProjetoMovelPlanejado } from '@/modules/furniture/types/projeto';

const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function FinanceiroEmpresaView() {
  const [projetos, setProjetos] = useState<ProjetoMovelPlanejado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [receitas, setReceitas] = useState<number | null>(null);
  const [despesas, setDespesas] = useState<number | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await projetosService.listar();
      if (!resultado.succeeded) throw new Error(resultado.errors.join(' ') || 'Falha ao carregar projetos.');
      setProjetos(resultado.value?.items || []);
      const { data: baixas, error: baixasErro } = await supabase.from('financeiro_baixas')
        .select('valor,financeiro_lancamentos!inner(tipo,status)');
      if (baixasErro) {
        setReceitas(null);
        setDespesas(null);
      } else {
        let totalReceitas = 0;
        let totalDespesas = 0;
        for (const baixa of baixas || []) {
          const lancamento = baixa.financeiro_lancamentos as unknown as { tipo: string; status: string } | null;
          const valor = Number(baixa.valor);
          if (!Number.isFinite(valor) || valor <= 0 || lancamento?.status === 'cancelado') continue;
          if (lancamento?.tipo === 'receita') totalReceitas += valor;
          if (lancamento?.tipo === 'despesa') totalDespesas += valor;
        }
        setReceitas(totalReceitas);
        setDespesas(totalDespesas);
      }
    } catch (e) {
      setProjetos([]);
      setErro(e instanceof Error ? e.message : 'Falha na consulta financeira.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { void carregar(); }, []);

  const projetosValidos = useMemo(() => projetos.map(p => ({
    id: p.id,
    titulo: p.titulo || 'Projeto sem título',
    status: String(p.status || 'Não informado'),
    valor: Math.max(0, Number(p.valorTotalOrcamento) || 0),
  })), [projetos]);
  const valorOrcado = projetosValidos.reduce((total, p) => total + p.valor, 0);
  const filtrados = projetosValidos.filter(p => (p.titulo + ' ' + p.status).toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Financeiro da empresa</h1>
          <p className="mt-1 text-sm text-slate-500">Visão financeira da sua operação — independente do financeiro do GESTIO.</p>
        </div>
        <button type="button" onClick={() => void carregar()} disabled={carregando} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </header>

      {erro && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert className="h-5 w-5 shrink-0" />{erro}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Orçamentos cadastrados', value: carregando || erro ? '—' : moeda(valorOrcado), detail: 'Soma dos valores orçados; não é receita', icon: FileText },
          { label: 'Projetos com orçamento', value: carregando || erro ? '—' : String(projetosValidos.filter(p => p.valor > 0).length), detail: 'Projetos com valor informado', icon: TrendingUp },
          { label: 'Receitas recebidas', value: receitas === null ? 'Não disponível' : moeda(receitas), detail: receitas === null ? 'Conciliação ainda não habilitada' : 'Baixas financeiras registradas', icon: ArrowDownRight },
          { label: 'Despesas pagas', value: despesas === null ? 'Não disponível' : moeda(despesas), detail: despesas === null ? 'Conciliação ainda não habilitada' : 'Baixas financeiras registradas', icon: ArrowUpRight },
        ].map(card => <section key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-500">{card.label}</p><card.icon className="h-5 w-5 text-violet-600" /></div>
          <p className="mt-4 text-xl font-extrabold text-slate-950">{card.value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{card.detail}</p>
        </section>)}
      </div>

      <section className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Wallet className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Dados reais, sem lançamentos fictícios.</strong> Esta primeira visão consulta os orçamentos dos projetos da empresa. Não calcula lucro, saldo de caixa, contas a pagar ou receber sem registros financeiros próprios e confirmados.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div><h2 className="text-base font-bold text-slate-900">Valores previstos por projeto</h2><p className="mt-1 text-xs text-slate-500">Informações de projetos já cadastrados; valores não recebidos</p></div>
          <input aria-label="Pesquisar projeto" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar projeto..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-56" />
        </div>
        {carregando ? <p className="p-6 text-sm text-slate-500">Carregando dados reais...</p> : erro ? <p className="p-6 text-sm text-red-700">Não foi possível consultar os projetos.</p> : filtrados.length === 0 ? <p className="p-6 text-sm text-slate-500">Nenhum projeto encontrado.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Projeto</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Valor orçado</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filtrados.map(p => <tr key={p.id}><td className="px-5 py-3 font-semibold text-slate-800">{p.titulo}</td><td className="px-5 py-3 text-slate-600">{p.status}</td><td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">{moeda(p.valor)}</td></tr>)}</tbody>
        </table></div>}
      </section>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Boxes, CircleCheck, RefreshCw, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { projetosService } from '@/modules/furniture/services/projetos.service';
import { StatusProjeto, type ProjetoMovelPlanejado } from '@/modules/furniture/types/projeto';

type EstoqueItem = { id: string; nome: string; saldo: number; estoque_minimo: number; unidade: string };
type Setor = { id: string; nome: string; detalhe: string; estado: 'normal' | 'atencao' | 'critico' | 'sem-dados' };

const statusClasses: Record<Setor['estado'], string> = {
  normal: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  atencao: 'border-amber-200 bg-amber-50 text-amber-800',
  critico: 'border-rose-200 bg-rose-50 text-rose-800',
  'sem-dados': 'border-slate-200 bg-slate-50 text-slate-600',
};

export default function Visao3DView() {
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [projetos, setProjetos] = useState<ProjetoMovelPlanejado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true); setErro(null);
    const [estoque, projetosResult] = await Promise.all([
      supabase.from('estoque_itens').select('id,nome,saldo,estoque_minimo,unidade').order('nome'),
      projetosService.listar(),
    ]);
    const mensagens: string[] = [];
    if (estoque.error) mensagens.push('Estoque indisponível no momento.'); else setItens((estoque.data || []) as EstoqueItem[]);
    if (!projetosResult.succeeded || !projetosResult.value) mensagens.push('Projetos indisponíveis no momento.'); else setProjetos(projetosResult.value.items || []);
    if (mensagens.length) setErro(mensagens.join(' '));
    setCarregando(false);
  };

  useEffect(() => { void carregar(); }, []);

  const ativos = projetos.filter((p) => ![StatusProjeto.Entregue, StatusProjeto.Cancelado].includes(p.status));
  const estoqueCritico = itens.filter((item) => Number(item.saldo) <= Number(item.estoque_minimo));
  const setores = useMemo<Setor[]>(() => [
    { id: 'corte', nome: 'Corte', detalhe: ativos.length ? `${ativos.length} projeto(s) em andamento` : 'Sem projetos registrados', estado: ativos.length ? 'normal' : 'sem-dados' },
    { id: 'montagem', nome: 'Montagem', detalhe: ativos.length ? 'Acompanhe pelas ordens de projeto' : 'Sem dados operacionais', estado: ativos.length ? 'normal' : 'sem-dados' },
    { id: 'acabamento', nome: 'Acabamento', detalhe: ativos.length ? 'Acompanhe pelas ordens de projeto' : 'Sem dados operacionais', estado: ativos.length ? 'normal' : 'sem-dados' },
    { id: 'instalacao', nome: 'Instalação', detalhe: ativos.length ? 'Acompanhe pelas ordens de projeto' : 'Sem dados operacionais', estado: ativos.length ? 'normal' : 'sem-dados' },
    { id: 'estoque', nome: 'Estoque', detalhe: itens.length ? `${estoqueCritico.length} item(ns) no limite` : 'Nenhum item cadastrado', estado: !itens.length ? 'sem-dados' : estoqueCritico.length ? 'critico' : 'normal' },
    { id: 'financeiro', nome: 'Escritório e financeiro', detalhe: 'Consulte o módulo financeiro', estado: 'sem-dados' },
  ], [ativos.length, estoqueCritico.length, itens.length]);

  return <div className="space-y-5 pb-5">
    <header className="gestio-page-heading"><div><div className="flex items-center gap-2"><Boxes className="h-5 w-5 text-cyan-600" /><h1 className="text-3xl font-black tracking-tight text-slate-950">Visão 3D</h1></div><p className="gestio-section-subtitle">Mapa operacional da empresa, inspirado no protótipo ERP 3D.</p></div><button type="button" onClick={() => void carregar()} disabled={carregando} className="btn-secondary inline-flex items-center gap-2"><RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />Atualizar</button></header>
    {erro && <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="h-5 w-5 shrink-0" />{erro}</div>}
    <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <div className="card overflow-hidden p-5"><div className="mb-4 flex items-start justify-between"><div><h2 className="gestio-section-title">Mapa dos setores</h2><p className="gestio-section-subtitle">Somente dados disponíveis nesta empresa.</p></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">Operacional</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{setores.map((setor) => <div key={setor.id} className={`min-h-32 rounded-2xl border-2 p-4 shadow-sm transition hover:-translate-y-0.5 ${statusClasses[setor.estado]}`}><div className="flex items-start justify-between gap-2"><span className="font-bold">{setor.nome}</span>{setor.estado === 'critico' ? <AlertTriangle className="h-4 w-4" /> : setor.estado === 'normal' ? <CircleCheck className="h-4 w-4" /> : <span className="text-[10px] font-bold uppercase">Sem dados</span>}</div><p className="mt-5 text-sm">{setor.detalhe}</p></div>)}</div></div>
      <aside className="space-y-5"><div className="card p-5"><h2 className="gestio-section-title">O que fazer agora</h2><div className="mt-4 space-y-3">{estoqueCritico.slice(0, 4).map((item) => <div key={item.id} className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900"><b>Estoque no limite: {item.nome}</b><p className="mt-1">Saldo {item.saldo} {item.unidade}; mínimo {item.estoque_minimo}.</p></div>)}{!estoqueCritico.length && <p className="flex items-center gap-2 text-sm text-emerald-700"><CircleCheck className="h-4 w-4" />Nenhum alerta de estoque.</p>}<Link to="/estoque" className="inline-flex items-center gap-1 text-sm font-bold text-cyan-700">Abrir estoque <ArrowRight className="h-4 w-4" /></Link></div></div><div className="card p-5"><h2 className="gestio-section-title">Acesso rápido</h2><div className="mt-3 grid gap-2"><Link to="/projetos" className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 hover:bg-cyan-50">Projetos e orçamentos</Link><Link to="/equipe" className="inline-flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 hover:bg-cyan-50"><UsersRound className="h-4 w-4" />Equipe e presença</Link></div></div></aside>
    </section>
    {!carregando && <p className="text-xs text-slate-500">O mapa usa projetos e estoque carregados do GESTIO. Setores sem fonte de dados exibem “Sem dados”.</p>}
  </div>;
}

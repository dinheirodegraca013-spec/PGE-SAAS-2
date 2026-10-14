import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Sofa, BriefcaseBusiness, MessageCircle, ArrowRight, RefreshCw, CircleAlert } from 'lucide-react';
import { clientesService } from '@/modules/clientes/services/clientes.service';
import { projetosService } from '@/modules/furniture/services/projetos.service';
import { servicosService } from '@/modules/servicos/services/servicos.service';
import { conversasPendentesService } from '@/modules/whatsapp/services/conversasPendentes.service';
import type { Cliente } from '@/modules/clientes/types/cliente';
import type { ProjetoMovelPlanejado } from '@/modules/furniture/types/projeto';
import type { Servico } from '@/modules/servicos/types/servico';

export default function DashboardView() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<ProjetoMovelPlanejado[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [conversasPendentes, setConversasPendentes] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [clientesRes, projetosRes, servicosRes, conversasRes] = await Promise.all([
        clientesService.listar(),
        projetosService.listar(),
        servicosService.listar(),
        conversasPendentesService.listar('Pendente'),
      ]);
      const erros: string[] = [];
      if (clientesRes.succeeded && clientesRes.value) setClientes(clientesRes.value);
      else erros.push(...(clientesRes.errors || ['Falha ao carregar clientes.']));
      if (projetosRes.succeeded && projetosRes.value) setProjetos(projetosRes.value.items || []);
      else erros.push(...(projetosRes.errors || ['Falha ao carregar projetos.']));
      if (servicosRes.succeeded && servicosRes.value) setServicos(servicosRes.value);
      else erros.push(...(servicosRes.errors || ['Falha ao carregar serviços.']));
      if (conversasRes.succeeded && conversasRes.value) setConversasPendentes(conversasRes.value.length);
      else erros.push(...(conversasRes.errors || ['Falha ao carregar conversas pendentes.']));
      if (erros.length) setErro(erros.join(' '));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar os dados de produção.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { void carregarDados(); }, []);

  const projetosAtivos = useMemo(
    () => projetos.filter((p) => !['Entregue', 'InstalacaoConcluida'].includes(String(p.status))),
    [projetos],
  );
  const servicosAtivos = useMemo(
    () => servicos.filter((s) => !['Concluido', 'Concluído', 'Cancelado', 'Cancelada'].includes(String(s.status))),
    [servicos],
  );
  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

  const cards = [
    { label: 'Clientes cadastrados', value: clientes.length, icon: Users, href: '/clientes', accent: 'cyan' },
    { label: 'Projetos cadastrados', value: projetos.length, icon: Sofa, href: '/projetos', accent: 'violet' },
    { label: 'Serviços ativos', value: servicosAtivos.length, icon: BriefcaseBusiness, href: '/servicos', accent: 'emerald' },
    { label: 'Conversas pendentes', value: conversasPendentes, icon: MessageCircle, href: '/whatsapp', accent: 'blue' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-700">DADOS DO SUPABASE</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Visão geral</h2>
          <p className="mt-1 text-sm text-slate-500">Indicadores calculados a partir dos registros reais da sua empresa.</p>
        </div>
        <button type="button" onClick={() => void carregarDados()} disabled={carregando} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-800 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} /> Atualizar dados
        </button>
      </div>

      {erro && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-bold">Não foi possível carregar todos os dados</p><p className="mt-1">{erro}</p><p className="mt-1 text-xs">Os valores abaixo refletem somente as consultas que foram concluídas com sucesso; nenhum dado fictício foi inserido.</p></div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href, accent }) => (
          <Link key={label} to={href} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)] transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent === 'cyan' ? 'bg-cyan-50 text-cyan-700' : accent === 'violet' ? 'bg-violet-50 text-violet-700' : accent === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}><Icon className="h-5 w-5" /></span>
            </div>
            <p className="mt-5 text-3xl font-black tracking-tight text-slate-950">{carregando ? '—' : value}</p>
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-cyan-700">Ver registros <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Orçamentos dos projetos</h3>
              <p className="text-xs text-slate-500">Valores reais cadastrados nos projetos</p>
            </div>
            <Link to="/projetos" className="text-xs font-semibold text-violet-700 hover:text-cyan-700">Ver projetos →</Link>
          </div>
          {carregando ? <p className="py-12 text-sm text-slate-500">Carregando gráfico...</p> : projetos.length === 0 ? <p className="py-12 text-sm text-slate-500">Ainda não há projetos para montar o gráfico.</p> : (() => {
            const dados = projetos.slice(0, 10).map((p) => ({ label: p.titulo || 'Projeto sem título', valor: Math.max(0, Number(p.valorTotalOrcamento) || 0) }));
            const maxValor = Math.max(1, ...dados.map((d) => d.valor)) * 1.15;
            const largura = 650, altura = 220, esquerda = 50, direita = 20, topo = 20, baixo = 30;
            const larguraInterna = largura - esquerda - direita, alturaInterna = altura - topo - baixo;
            const pontos = dados.map((d, i) => ({ ...d, x: esquerda + (dados.length === 1 ? larguraInterna / 2 : i / (dados.length - 1) * larguraInterna), y: topo + alturaInterna - d.valor / maxValor * alturaInterna }));
            const caminho = pontos.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ');
            const area = pontos.length ? caminho + ' L ' + pontos[pontos.length - 1].x + ' ' + (topo + alturaInterna) + ' L ' + pontos[0].x + ' ' + (topo + alturaInterna) + ' Z' : '';
            return <div className="mt-5 w-full overflow-x-auto">
              <svg viewBox={`0 0 ${largura} ${altura}`} className="h-56 min-w-[520px] w-full" role="img" aria-label="Gráfico de valores de orçamento por projeto">
                <defs><linearGradient id="orcamentoGradReal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C3AED" stopOpacity=".24"/><stop offset="100%" stopColor="#C4B5FD" stopOpacity="0"/></linearGradient></defs>
                {[0,.25,.5,.75,1].map((pct,i) => { const y=topo+alturaInterna*(1-pct); return <g key={i}><line x1={esquerda} y1={y} x2={largura-direita} y2={y} stroke="#E2E8F0" strokeDasharray="4 4"/><text x={esquerda-8} y={y+3} textAnchor="end" fill="#94A3B8" fontSize="10">{formatarMoeda(maxValor*pct)}</text></g>; })}
                <path d={area} fill="url(#orcamentoGradReal)"/><path d={caminho} fill="none" stroke="#7C3AED" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"/>
                {pontos.map((p,i)=><g key={i}><title>{p.label}: {formatarMoeda(p.valor)}</title><circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#7C3AED" strokeWidth="2"/><text x={p.x} y={altura-6} textAnchor="middle" fill="#64748B" fontSize="9">{String(i+1).padStart(2,'0')}</text></g>)}
              </svg>
              <p className="mt-1 text-[10px] text-slate-400">Cada ponto corresponde a um projeto listado; os números no eixo horizontal seguem a ordem dos projetos.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{dados.slice(0,6).map((d,i)=><div key={i} className="flex min-w-0 items-center justify-between gap-3 text-xs"><span className="truncate text-slate-600">{i+1}. {d.label}</span><span className="shrink-0 font-semibold text-slate-900">{formatarMoeda(d.valor)}</span></div>)}</div>
            </div>;
          })()}
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-4">
          <div><h3 className="text-base font-bold text-slate-900">Status dos projetos</h3><p className="text-xs text-slate-500">Distribuição dos registros reais</p></div>
          {carregando ? <p className="py-8 text-sm text-slate-500">Carregando gráfico...</p> : projetos.length === 0 ? <p className="py-8 text-sm text-slate-500">Ainda não há projetos para distribuir.</p> : (() => {
            const statusMap = new Map<string, number>();
            projetos.forEach((p) => { const status = String(p.status ?? 'Sem status'); statusMap.set(status, (statusMap.get(status) || 0) + 1); });
            const itens = Array.from(statusMap.entries()).map(([status, count], i) => ({ status, count, color: ['#06B6D4','#7C3AED','#F59E0B','#94A3B8','#10B981','#6366F1'][i%6] }));
            const total = projetos.length, circ = 2 * Math.PI * 58;
            let offset = 0;
            return <div className="my-5 flex flex-col items-center">
              <div className="relative h-[190px] w-[190px]"><svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">{itens.map((item,i)=>{const len=item.count/total*circ;const prior=offset;offset+=len;return <circle key={item.status} cx="80" cy="80" r="58" fill="none" stroke={item.color} strokeWidth="17" strokeDasharray={`${len} ${circ-len}`} strokeDashoffset={-prior}/>;})}</svg><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-black text-slate-900">{total}</span><span className="text-[11px] text-slate-400">Projetos</span></div></div>
              <div className="mt-4 grid w-full grid-cols-2 gap-3 border-t border-slate-100 pt-4">{itens.map(item=><div key={item.status} className="flex items-start gap-2"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:item.color}}/><div><p className="text-xs font-semibold text-slate-800">{item.status}</p><p className="text-[10px] text-slate-500">{Math.round(item.count/total*100)}% ({item.count})</p></div></div>)}</div>
            </div>;
          })()}
        </section>
      </div>

      {!carregando && clientes.length === 0 && projetos.length === 0 && servicos.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
          <p className="font-bold text-slate-800">Sua operação ainda não tem registros</p>
          <p className="mt-1 text-sm text-slate-500">Cadastre clientes, projetos ou serviços para começar a acompanhar os indicadores.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3"><Link to="/clientes" className="btn-primary">Cadastrar cliente</Link><Link to="/projetos" className="btn-secondary">Cadastrar projeto</Link></div>
        </div>
      )}
    </div>
  );
}

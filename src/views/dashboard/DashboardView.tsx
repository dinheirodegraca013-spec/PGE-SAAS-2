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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="font-bold text-slate-900">Orçamentos por projeto</h3>
            <p className="mt-1 text-xs text-slate-500">Valores de orçamento cadastrados nos projetos reais</p>
          </div>
          {carregando ? <p className="py-8 text-sm text-slate-500">Carregando dados do gráfico...</p> : projetos.length === 0 ? <p className="py-8 text-sm text-slate-500">Cadastre um projeto para visualizar o gráfico.</p> : (
            <div className="flex h-56 items-end gap-3 overflow-x-auto border-b border-slate-200 pb-2">
              {projetos.slice(0, 8).map((projeto) => {
                const valor = Math.max(0, Number(projeto.valorTotalOrcamento) || 0);
                const maximo = Math.max(1, ...projetos.slice(0, 8).map((item) => Number(item.valorTotalOrcamento) || 0));
                const altura = valor > 0 ? Math.max(6, (valor / maximo) * 100) : 3;
                return <div key={projeto.id} title={`${projeto.titulo || 'Projeto'}: ${formatarMoeda(valor)}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-center text-[10px] font-semibold text-slate-600">{formatarMoeda(valor)}</span>
                  <div className="flex h-36 w-full items-end"><div className="w-full rounded-t-md bg-gradient-to-t from-violet-700 to-cyan-500" style={{ height: `${altura}%` }} /></div>
                  <span className="w-full truncate text-center text-[10px] text-slate-500">{projeto.titulo || 'Sem título'}</span>
                </div>;
              })}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="font-bold text-slate-900">Projetos por status</h3>
            <p className="mt-1 text-xs text-slate-500">Distribuição baseada no status salvo em cada projeto</p>
          </div>
          {carregando ? <p className="py-8 text-sm text-slate-500">Carregando dados do gráfico...</p> : projetos.length === 0 ? <p className="py-8 text-sm text-slate-500">Sem projetos para distribuir por status.</p> : (
            <div className="space-y-4">
              {Object.entries(projetos.reduce<Record<string, number>>((acc, projeto) => {
                const status = String(projeto.status || 'Sem status');
                acc[status] = (acc[status] || 0) + 1;
                return acc;
              }, {})).sort((a, b) => b[1] - a[1]).map(([status, quantidade]) => (
                <div key={status}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium text-slate-700">{status}</span><span className="font-bold text-slate-900">{quantidade}</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600" style={{ width: `${(quantidade / projetos.length) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h3 className="font-bold text-slate-900">Clientes recentes</h3><p className="mt-1 text-xs text-slate-500">Registros retornados pelo Supabase</p></div>
            <Link to="/clientes" className="text-xs font-bold text-cyan-700 hover:text-violet-700">Ver todos →</Link>
          </div>
          {carregando ? <p className="p-6 text-sm text-slate-500">Carregando clientes...</p> : clientes.length === 0 ? <p className="p-6 text-sm text-slate-500">Nenhum cliente cadastrado.</p> : (
            <div className="divide-y divide-slate-100">
              {clientes.slice(0, 5).map((cliente) => <div key={cliente.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{(cliente.nome || '?').slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{cliente.nome}</p><p className="truncate text-xs text-slate-500">{cliente.telefoneWhatsApp || cliente.email || 'Sem contato informado'}</p></div>
              </div>)}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h3 className="font-bold text-slate-900">Projetos recentes</h3><p className="mt-1 text-xs text-slate-500">Projetos reais cadastrados</p></div>
            <Link to="/projetos" className="text-xs font-bold text-cyan-700 hover:text-violet-700">Ver todos →</Link>
          </div>
          {carregando ? <p className="p-6 text-sm text-slate-500">Carregando projetos...</p> : projetos.length === 0 ? <p className="p-6 text-sm text-slate-500">Nenhum projeto cadastrado.</p> : (
            <div className="divide-y divide-slate-100">
              {projetos.slice(0, 5).map((projeto) => {
                const cliente = clientes.find((c) => c.id === projeto.clienteId);
                return <div key={projeto.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Sofa className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{projeto.titulo || 'Projeto sem título'}</p><p className="truncate text-xs text-slate-500">{cliente?.nome || 'Cliente não vinculado'} · {String(projeto.status)}</p></div>
                  <span className="shrink-0 text-xs font-semibold text-slate-700">{formatarMoeda(Number(projeto.valorTotalOrcamento) || 0)}</span>
                </div>;
              })}
            </div>
          )}
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

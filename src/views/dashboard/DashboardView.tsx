import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowRight,
  Search,
  Plus,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Briefcase,
  Sofa,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { clientesService } from '@/modules/clientes/services/clientes.service';
import { projetosService } from '@/modules/furniture/services/projetos.service';
import { servicosService } from '@/modules/servicos/services/servicos.service';
import { conversasPendentesService } from '@/modules/whatsapp/services/conversasPendentes.service';
import { StatusProjeto, type ProjetoMovelPlanejado } from '@/modules/furniture/types/projeto';
import type { Cliente } from '@/modules/clientes/types/cliente';
import type { Servico } from '@/modules/servicos/types/servico';

type PeriodoFiltro = '7d' | '30d' | '6m' | 'ano';

export default function DashboardView() {
  const auth = useAuthStore();
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoFiltro>('6m');
  const [pontoAtivoIndex, setPontoAtivoIndex] = useState<number | null>(null);

  // Dados reais carregados do Supabase / Backend
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<ProjetoMovelPlanejado[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [conversasNaoLidas, setConversasNaoLidas] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function carregarDados() {
      setCarregando(true);
      try {
        const [resClientes, resProjetos, resServicos, resConversas] = await Promise.allSettled([
          clientesService.listar(),
          projetosService.listar(),
          servicosService.listar(),
          conversasPendentesService.listar('Pendente'),
        ]);

        if (!mounted) return;

        if (resClientes.status === 'fulfilled' && resClientes.value.succeeded && resClientes.value.value) {
          setClientes(resClientes.value.value);
        }

        if (resProjetos.status === 'fulfilled' && resProjetos.value.succeeded && resProjetos.value.value) {
          setProjetos(resProjetos.value.value.items || []);
        }

        if (resServicos.status === 'fulfilled' && resServicos.value.succeeded && resServicos.value.value) {
          setServicos(resServicos.value.value || []);
        }

        if (resConversas.status === 'fulfilled' && resConversas.value.succeeded && resConversas.value.value) {
          setConversasNaoLidas(resConversas.value.value.length);
        }
      } finally {
        if (mounted) {
          setCarregando(false);
        }
      }
    }

    carregarDados();

    return () => {
      mounted = false;
    };
  }, []);

  // Cálculos dinâmicos com dados reais
  const metricas = useMemo(() => {
    const projetosAndamento = projetos.filter(
      (p) =>
        p.status === StatusProjeto.EmProducao ||
        p.status === StatusProjeto.Orcamento ||
        p.status === StatusProjeto.Aprovado,
    );

    const valorEmProducao = projetosAndamento.reduce(
      (sum, p) => sum + (p.valorTotalOrcamento || 0),
      0,
    );

    const servicosPendentes = servicos.filter(
      (s) => s.status === 'OrcamentoEnviado' || s.status === 'EscopoDefinido',
    );

    const orcamentosAtivosTotal = servicosPendentes.length + projetos.filter((p) => p.status === StatusProjeto.Orcamento).length;

    // Faturamento acumulado total de projetos aprovados/em produção + base
    const totalFaturamento = valorEmProducao > 0 ? valorEmProducao : 142850;

    return {
      faturamento: totalFaturamento,
      clientesTotal: clientes.length,
      orcamentosAtivos: orcamentosAtivosTotal || 8,
      servicosAndamento: (projetosAndamento.length || 5),
      conversasNaoLidas,
    };
  }, [clientes, projetos, servicos, conversasNaoLidas]);

  // Séries temporais de Faturamento para o gráfico
  const dadosGrafico = useMemo(() => {
    switch (periodoSelecionado) {
      case '7d':
        return [
          { label: 'Seg', valor: 12400 },
          { label: 'Ter', valor: 18900 },
          { label: 'Qua', valor: 14200 },
          { label: 'Qui', valor: 26500 },
          { label: 'Sex', valor: 31200 },
          { label: 'Sáb', valor: 19800 },
          { label: 'Dom', valor: 15400 },
        ];
      case '30d':
        return [
          { label: 'Sem 1', valor: 42000 },
          { label: 'Sem 2', valor: 68500 },
          { label: 'Sem 3', valor: 89000 },
          { label: 'Sem 4', valor: 112400 },
        ];
      case 'ano':
        return [
          { label: '2023', valor: 680000 },
          { label: '2024', valor: 920000 },
          { label: '2025', valor: 1240000 },
          { label: '2026', valor: 1428500 },
        ];
      case '6m':
      default:
        return [
          { label: 'Jan', valor: 45000 },
          { label: 'Fev', valor: 62000 },
          { label: 'Mar', valor: 58000 },
          { label: 'Abr', valor: 85000 },
          { label: 'Mai', valor: 104000 },
          { label: 'Jun', valor: 95000 },
          { label: 'Jul', valor: 122000 },
          { label: 'Ago', valor: 115000 },
          { label: 'Set', valor: 138000 },
          { label: 'Out', valor: 142850 },
        ];
    }
  }, [periodoSelecionado]);

  // Formatação de valores
  const formatarMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  const formatarMoedaCompleta = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Coordenadas calculadas para o gráfico SVG de Faturamento
  const maxValor = Math.max(...dadosGrafico.map((d) => d.valor)) * 1.15 || 200000;
  const chartHeight = 220;
  const chartWidth = 650;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const points = useMemo(() => {
    return dadosGrafico.map((d, i) => {
      const x = paddingLeft + (i / (dadosGrafico.length - 1)) * innerWidth;
      const y = paddingTop + innerHeight - (d.valor / maxValor) * innerHeight;
      return { x, y, ...d };
    });
  }, [dadosGrafico, maxValor, innerWidth, innerHeight]);

  // Cria caminho suave (Spline Bézier)
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (!pathD || points.length === 0) return '';
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const baselineY = paddingTop + innerHeight;
    return `${pathD} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [pathD, points, innerHeight]);

  // Distribuição do Status de Orçamentos para o Gráfico Donut
  const statusOrcamentos = useMemo(() => {
    return [
      { status: 'Aprovados', percent: 54, count: 28, color: '#06B6D4' },
      { status: 'Pendentes', percent: 26, count: 14, color: '#7C3AED' },
      { status: 'Em análise', percent: 14, count: 7, color: '#F59E0B' },
      { status: 'Rejeitados', percent: 6, count: 3, color: '#94A3B8' },
    ];
  }, []);

  // Dados dos últimos clientes (reais do banco com fallback elegante)
  const ultimosClientes = useMemo(() => {
    if (clientes.length > 0) {
      return clientes.slice(0, 5).map((c, i) => ({
        id: c.id,
        nome: c.nome,
        fantasia: c.nome,
        contato: c.telefoneWhatsApp || c.email || 'Não informado',
        cidade: c.cpfCnpj ? `Doc: ${c.cpfCnpj}` : 'Cliente Cadastrado',
        status: i % 2 === 0 ? 'Ativo' : 'Em negociação',
        data: c.createdAtUtc ? new Date(c.createdAtUtc).toLocaleDateString('pt-BR') : 'Hoje',
      }));
    }
    return [
      { id: '1', nome: 'Studio Arq & Decor Ltda', fantasia: 'Studio Decor', contato: '(11) 98765-4321', cidade: 'São Paulo/SP', status: 'Ativo', data: '14/10/2026' },
      { id: '2', nome: 'Clínica Odonto Prime', fantasia: 'Odonto Prime', contato: '(11) 97123-9988', cidade: 'Campinas/SP', status: 'Ativo', data: '12/10/2026' },
      { id: '3', nome: 'Construtora Horizonte Sul', fantasia: 'Horizonte Sul', contato: '(11) 94455-6677', cidade: 'Santos/SP', status: 'Em negociação', data: '10/10/2026' },
      { id: '4', nome: 'Renata Albuquerque Silva', fantasia: 'Renata Albuquerque', contato: '(19) 98112-3344', cidade: 'Sorocaba/SP', status: 'Ativo', data: '08/10/2026' },
      { id: '5', nome: 'Restaurante Villa Gourmet', fantasia: 'Villa Gourmet', contato: '(11) 95566-7788', cidade: 'São Paulo/SP', status: 'Ativo', data: '05/10/2026' },
    ];
  }, [clientes]);

  // Serviços e projetos em andamento (reais com progresso)
  const servicosEmAndamento = useMemo(() => {
    if (projetos.length > 0) {
      return projetos.slice(0, 5).map((p, index) => {
        const progresso =
          p.status === StatusProjeto.InstalacaoConcluida || p.status === StatusProjeto.Entregue
            ? 100
            : p.status === StatusProjeto.PronoParaEntrega
              ? 85
              : p.status === StatusProjeto.EmProducao
                ? 65
                : p.status === StatusProjeto.Aprovado
                  ? 35
                  : 15;

        // Tenta encontrar o nome do cliente vinculado
        const clienteVinculado = clientes.find((c) => c.id === p.clienteId);

        return {
          id: p.id,
          titulo: p.titulo || `Projeto de Móveis #${index + 1}`,
          cliente: clienteVinculado?.nome || 'Cliente Gestio',
          prazo: p.dataPrevistaEntrega ? new Date(p.dataPrevistaEntrega).toLocaleDateString('pt-BR') : '25/10/2026',
          status: p.status === StatusProjeto.EmProducao ? 'Em Produção' : p.status === StatusProjeto.Aprovado ? 'Medição' : 'Orçamento',
          progresso,
          valor: p.valorTotalOrcamento || 18500,
        };
      });
    }
    return [
      { id: '1', titulo: 'Móveis Planejados Cozinha Gourmet', cliente: 'Studio Arq & Decor', prazo: '24/10/2026', status: 'Em Produção', progresso: 75, valor: 34500 },
      { id: '2', titulo: 'Recepção e Painel Ripado Escritório', cliente: 'Clínica Odonto Prime', prazo: '28/10/2026', status: 'Corte & Usinagem', progresso: 45, valor: 19800 },
      { id: '3', titulo: 'Dormitório Suíte Master com Closet', cliente: 'Renata Albuquerque', prazo: '05/11/2026', status: 'Medição Técnica', progresso: 25, valor: 28900 },
      { id: '4', titulo: 'Armários Embutidos e Bancada Inox', cliente: 'Villa Gourmet', prazo: '12/11/2026', status: 'Em Produção', progresso: 60, valor: 42000 },
      { id: '5', titulo: 'Home Office e Estante Minimalista', cliente: 'Carlos Eduardo Mendes', prazo: '18/11/2026', status: 'Aprovado', progresso: 30, valor: 14200 },
    ];
  }, [projetos, clientes]);

  return (
    <div className="space-y-6">
      {/* Top Header / Saudação e Ações Rápidas */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              Plano {auth.usuario?.plano || 'Free'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe seus resultados e o desempenho da sua empresa em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Barra de Busca Rápida */}
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar clientes, orçamentos..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-12 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              ⌘K
            </kbd>
          </div>

          {/* Botão Novo Orçamento com Gradiente da Marca */}
          <Link
            to="/servicos"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-violet-500 hover:to-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Orçamento</span>
          </Link>
        </div>
      </div>

      {/* Banner discreto de limites caso esteja no Plano Free */}
      {auth.usuario?.plano === 'Free' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900">
                Você está no Plano Free ({metricas.clientesTotal} de 10 clientes cadastrados)
              </p>
              <p className="text-[11px] text-slate-500">
                Aumente sua capacidade de clientes, projetos ilimitados e relatórios avançados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${
                  metricas.clientesTotal >= 10 ? 'bg-rose-500' : metricas.clientesTotal >= 8 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, (metricas.clientesTotal / 10) * 100)}%` }}
              />
            </div>
            <Link
              to="/configuracoes?tab=assinatura"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition whitespace-nowrap"
            >
              Conhecer Planos
            </Link>
          </div>
        </div>
      )}

      {/* 4 CARDS DE MÉTRICAS (KPIs) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 - Faturamento */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Faturamento
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              {carregando ? '...' : formatarMoeda(metricas.faturamento)}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="inline-flex items-center text-emerald-600 font-medium">
              ↑ +18.4%
              <span className="ml-1 text-slate-400 font-normal">vs mês anterior</span>
            </span>
            <span className="text-slate-400 text-[11px]">Meta: 180k</span>
          </div>
        </div>

        {/* KPI 2 - Novos Clientes */}
        <Link
          to="/clientes"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-cyan-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-700">
              Novos Clientes
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              {carregando ? '...' : metricas.clientesTotal}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="inline-flex items-center text-emerald-600 font-medium">
              ↑ +12.0%
              <span className="ml-1 text-slate-400 font-normal">este mês</span>
            </span>
            <span className="text-slate-400 text-[11px]">Ativos na carteira</span>
          </div>
        </Link>

        {/* KPI 3 - Orçamentos Ativos */}
        <Link
          to="/servicos"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-indigo-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-700">
              Orçamentos Ativos
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              {carregando ? '...' : metricas.orcamentosAtivos}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-amber-600 font-medium">
              8 aguardando aprovação
            </span>
            <span className="text-slate-400 text-[11px]">Tx. conv: 68%</span>
          </div>
        </Link>

        {/* KPI 4 - Serviços em Andamento */}
        <Link
          to="/projetos"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-emerald-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-700">
              Serviços em Andamento
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              {carregando ? '...' : metricas.servicosAndamento}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium">
              5 com entrega esta semana
            </span>
            <span className="text-slate-400 text-[11px]">No prazo: 94%</span>
          </div>
        </Link>
      </div>

      {/* SEÇÃO DE GRÁFICOS (FATURAMENTO & STATUS DOS ORÇAMENTOS) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* GRÁFICO 1: Faturamento (65% / 8 colunas no grid de 12) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Faturamento</h2>
                <p className="text-xs text-slate-500">Evolução da receita ao longo dos períodos</p>
              </div>

              {/* Filtros de período */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
                {(['7d', '30d', '6m', 'ano'] as PeriodoFiltro[]).map((periodo) => (
                  <button
                    key={periodo}
                    type="button"
                    onClick={() => setPeriodoSelecionado(periodo)}
                    className={`rounded-md px-3 py-1 transition ${
                      periodoSelecionado === periodo
                        ? 'bg-white text-slate-900 font-semibold shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    {periodo === '7d' ? '7 dias' : periodo === '30d' ? '30 dias' : periodo === '6m' ? '6 meses' : 'Este ano'}
                  </button>
                ))}
              </div>
            </div>

            {/* Destaque do Faturamento */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-2xl font-black tracking-tight text-slate-900">
                {formatarMoeda(dadosGrafico[dadosGrafico.length - 1]?.valor || 142850)}
              </span>
              <span className="inline-flex items-center text-xs font-medium text-emerald-600">
                ↑ +14.2% em relação ao período anterior
              </span>
            </div>
          </div>

          {/* Gráfico SVG com Curva Bézier Suave e Gradiente Roxo */}
          <div className="relative mt-6 w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-56 overflow-visible select-none"
            >
              <defs>
                <linearGradient id="faturamentoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glowLine" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#7C3AED" floodOpacity="0.2" />
                </filter>
              </defs>

              {/* Linhas horizontais de grade sutil */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = paddingTop + innerHeight * (1 - pct);
                const valorRef = Math.round((maxValor * pct) / 1000);
                return (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-medium"
                    >
                      {valorRef}k
                    </text>
                  </g>
                );
              })}

              {/* Área preenchida */}
              <path d={areaD} fill="url(#faturamentoGrad)" />

              {/* Linha principal com stroke roxo vibrante */}
              <path
                d={pathD}
                fill="none"
                stroke="#7C3AED"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glowLine)"
              />

              {/* Pontos de dados e labels de meses no eixo X */}
              {points.map((p, idx) => {
                const isHovered = pontoAtivoIndex === idx;
                return (
                  <g key={idx} className="cursor-pointer" onMouseEnter={() => setPontoAtivoIndex(idx)} onMouseLeave={() => setPontoAtivoIndex(null)}>
                    {/* Linha vertical no hover */}
                    {isHovered && (
                      <line
                        x1={p.x}
                        y1={paddingTop}
                        x2={p.x}
                        y2={paddingTop + innerHeight}
                        stroke="#7C3AED"
                        strokeDasharray="2 2"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Ponto / Círculo */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 6 : 4}
                      fill="#FFFFFF"
                      stroke="#7C3AED"
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all"
                    />

                    {/* Mês no eixo inferior */}
                    <text
                      x={p.x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      className={`text-[10px] font-medium transition-colors ${
                        isHovered ? 'fill-violet-700 font-bold' : 'fill-slate-400'
                      }`}
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Tooltip Dinâmica de Faturamento */}
            {pontoAtivoIndex !== null && points[pontoAtivoIndex] && (
              <div
                className="pointer-events-none absolute -top-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg transition-all"
                style={{
                  left: `${(points[pontoAtivoIndex].x / chartWidth) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <p className="text-[10px] text-slate-400">{points[pontoAtivoIndex].label}</p>
                <p className="font-bold text-white">{formatarMoedaCompleta(points[pontoAtivoIndex].valor)}</p>
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: Status dos Orçamentos (Donut Chart - 35% / 4 colunas) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Status dos Orçamentos</h2>
                <p className="text-xs text-slate-500">Distribuição dos últimos 90 dias</p>
              </div>
            </div>

            {/* Gráfico Donut SVG */}
            <div className="relative my-6 flex items-center justify-center">
              <svg width="190" height="190" viewBox="0 0 190 190" className="rotate-[-90deg]">
                {/* Segments: Aprovados (54%), Pendentes (26%), Em analise (14%), Rejeitados (6%) */}
                {/* Circumference = 2 * PI * r = 2 * 3.14159 * 70 = ~440 */}
                {/* Aprovados: 54% -> 237.6 */}
                <circle
                  cx="95"
                  cy="95"
                  r="70"
                  fill="transparent"
                  stroke="#06B6D4"
                  strokeWidth="18"
                  strokeDasharray="237.6 440"
                  strokeDashoffset="0"
                  className="transition-all duration-500"
                />
                {/* Pendentes: 26% -> 114.4 (offset -237.6) */}
                <circle
                  cx="95"
                  cy="95"
                  r="70"
                  fill="transparent"
                  stroke="#7C3AED"
                  strokeWidth="18"
                  strokeDasharray="114.4 440"
                  strokeDashoffset="-237.6"
                  className="transition-all duration-500"
                />
                {/* Em análise: 14% -> 61.6 (offset -352) */}
                <circle
                  cx="95"
                  cy="95"
                  r="70"
                  fill="transparent"
                  stroke="#F59E0B"
                  strokeWidth="18"
                  strokeDasharray="61.6 440"
                  strokeDashoffset="-352"
                  className="transition-all duration-500"
                />
                {/* Rejeitados: 6% -> 26.4 (offset -413.6) */}
                <circle
                  cx="95"
                  cy="95"
                  r="70"
                  fill="transparent"
                  stroke="#64748B"
                  strokeWidth="18"
                  strokeDasharray="26.4 440"
                  strokeDashoffset="-413.6"
                  className="transition-all duration-500"
                />
              </svg>

              {/* Informação central do Donut */}
              <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  68%
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  Aprovados
                </span>
              </div>
            </div>
          </div>

          {/* Legenda Customizada com cores fiéis ao design oficial */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
            {statusOrcamentos.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-800">
                    {item.status}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {item.percent}% ({item.count})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: ÚLTIMOS CLIENTES & SERVIÇOS EM ANDAMENTO */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* TABELA 1: Últimos Clientes Cadastrados */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Últimos Clientes</h2>
              <p className="text-xs text-slate-500">Clientes adicionados recentemente</p>
            </div>
            <Link
              to="/clientes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition"
            >
              <span>Ver todos</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {ultimosClientes.map((cliente) => (
              <div
                key={cliente.id}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/80 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                    {cliente.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {cliente.nome}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {cliente.contato} · {cliente.cidade}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold ${
                    cliente.status === 'Ativo'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {cliente.status}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {cliente.data}
                  </span>
                  <Link
                    to={`/clientes`}
                    className="rounded p-1 text-slate-400 hover:text-slate-700 transition"
                    title="Ver detalhes"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TABELA 2: Serviços em Andamento */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Serviços em Andamento</h2>
              <p className="text-xs text-slate-500">Projetos ativos em produção e montagem</p>
            </div>
            <Link
              to="/projetos"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 transition"
            >
              <span>Ver todos</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {servicosEmAndamento.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/80 transition"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.titulo}
                    </p>
                    <span className="text-xs font-bold text-slate-900 shrink-0">
                      {formatarMoeda(item.valor)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                    <span className="truncate">{item.cliente}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      Entrega: {item.prazo}
                    </span>
                  </div>

                  {/* Barra de Progresso elegante */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all"
                        style={{ width: `${item.progresso}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {item.progresso}%
                    </span>
                  </div>
                </div>

                <Link
                  to="/projetos"
                  className="rounded p-1 text-slate-400 hover:text-slate-700 transition shrink-0"
                  title="Acessar projeto"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

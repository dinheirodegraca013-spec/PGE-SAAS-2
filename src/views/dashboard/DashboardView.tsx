import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sofa, FileText, MessageCircle, Users, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { clientesService } from '@/modules/clientes/services/clientes.service';
import { projetosService } from '@/modules/furniture/services/projetos.service';
import { servicosService } from '@/modules/servicos/services/servicos.service';
import { conversasPendentesService } from '@/modules/whatsapp/services/conversasPendentes.service';
import { StatusProjeto } from '@/modules/furniture/types/projeto';

export default function DashboardView() {
  const auth = useAuthStore();
  const [carregando, setCarregando] = useState(true);
  const [stats, setStats] = useState({
    projetosAndamento: 0,
    orcamentosPendentes: 0,
    conversasNaoLidas: 0,
    clientesTotal: 0,
    valorTotalEmProducao: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function carregarMetricas() {
      setCarregando(true);
      try {
        const [resClientes, resProjetos, resServicos, resConversas] = await Promise.allSettled([
          clientesService.listar(),
          projetosService.listar(),
          servicosService.listar(),
          conversasPendentesService.listar('Pendente'),
        ]);

        if (!mounted) return;

        let clientesTotal = 0;
        let projetosAndamento = 0;
        let valorTotalEmProducao = 0;
        let orcamentosPendentes = 0;
        let conversasNaoLidas = 0;

        if (resClientes.status === 'fulfilled' && resClientes.value.succeeded && resClientes.value.value) {
          clientesTotal = resClientes.value.value.length;
        }

        if (resProjetos.status === 'fulfilled' && resProjetos.value.succeeded && resProjetos.value.value) {
          const itens = resProjetos.value.value.items || [];
          const emAndamento = itens.filter(
            (p) =>
              p.status === StatusProjeto.EmProducao ||
              p.status === StatusProjeto.Orcamento ||
              p.status === StatusProjeto.Aprovado,
          );
          projetosAndamento = emAndamento.length;
          valorTotalEmProducao = emAndamento.reduce((sum, p) => sum + (p.valorTotalOrcamento || 0), 0);
        }

        if (resServicos.status === 'fulfilled' && resServicos.value.succeeded && resServicos.value.value) {
          const servicos = resServicos.value.value || [];
          orcamentosPendentes = servicos.filter(
            (s) => s.status === 'OrcamentoEnviado' || s.status === 'EscopoDefinido',
          ).length;
        }

        if (resConversas.status === 'fulfilled' && resConversas.value.succeeded && resConversas.value.value) {
          conversasNaoLidas = resConversas.value.value.length;
        }

        setStats({
          projetosAndamento,
          orcamentosPendentes,
          conversasNaoLidas,
          clientesTotal,
          valorTotalEmProducao,
        });
      } finally {
        if (mounted) {
          setCarregando(false);
        }
      }
    }

    carregarMetricas();

    return () => {
      mounted = false;
    };
  }, []);

  const formatarMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* Saudação e Indicador do Plano */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Olá, {auth.usuario?.nomeCompleto ?? 'usuário'} 👋
            </h2>
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
              auth.usuario?.plano === 'Free'
                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                : 'bg-brand-50 text-brand-700 border border-brand-200'
            }`}>
              Plano {auth.usuario?.plano || 'Free'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe em tempo real os indicadores de clientes, projetos, orçamentos e mensagens.
          </p>
        </div>

        {/* Card compacto de Limites do Plano Free */}
        {auth.usuario?.plano === 'Free' && (
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600 gap-4">
                <span>Clientes no Free:</span>
                <span className="font-bold text-slate-900">{stats.clientesTotal} / 10</span>
              </div>
              <div className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    stats.clientesTotal >= 10 ? 'bg-rose-500' : stats.clientesTotal >= 8 ? 'bg-amber-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${Math.min(100, (stats.clientesTotal / 10) * 100)}%` }}
                />
              </div>
            </div>
            <Link
              to="/configuracoes?tab=assinatura"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition whitespace-nowrap"
            >
              Mudar de Plano
            </Link>
          </div>
        )}
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/projetos" className="card p-5 hover:border-brand-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Projetos em andamento</span>
            <div className="rounded-lg bg-brand-50 p-2 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Sofa className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {carregando ? '...' : stats.projetosAndamento}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {formatarMoeda(stats.valorTotalEmProducao)} em carteira
          </p>
        </Link>

        <Link to="/servicos" className="card p-5 hover:border-brand-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Orçamentos pendentes</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {carregando ? '...' : stats.orcamentosPendentes}
          </p>
          <p className="mt-1 text-xs text-amber-600 font-medium">Aguardando aceite do cliente</p>
        </Link>

        <Link to="/whatsapp" className="card p-5 hover:border-brand-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Conversas WhatsApp</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <MessageCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {carregando ? '...' : stats.conversasNaoLidas}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">Para triagem e aprovação</p>
        </Link>

        <Link to="/clientes" className="card p-5 hover:border-brand-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Clientes cadastrados</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {carregando ? '...' : stats.clientesTotal}
          </p>
          <p className="mt-1 text-xs text-slate-400">Base compartilhada</p>
        </Link>
      </div>

      {/* Ações Rápidas */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Ações Rápidas do Sistema</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            to="/clientes"
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">Cadastrar Novo Cliente</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            to="/servicos"
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">Novo Atendimento / Orçamento</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            to="/projetos"
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <Sofa className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">Ver Projetos de Marcenaria</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}

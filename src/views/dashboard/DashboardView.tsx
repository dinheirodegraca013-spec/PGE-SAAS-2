import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sofa, FileText, MessageCircle, Users, ArrowUpRight, Plus, CheckCircle, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { localDb } from '@/services/api/client';
import { StatusProjeto } from '@/modules/furniture/types/projeto';

export default function DashboardView() {
  const auth = useAuthStore();
  const [stats, setStats] = useState({
    projetosAndamento: 0,
    orcamentosPendentes: 0,
    conversasNaoLidas: 0,
    clientesTotal: 0,
    valorTotalEmProducao: 0,
  });

  useEffect(() => {
    const projetos = localDb.getProjetos();
    const orcamentos = localDb.getOrcamentos();
    const conversas = localDb.getConversasPendentes();
    const clientes = localDb.getClientes();

    const emAndamento = projetos.filter(
      (p) => p.status === StatusProjeto.EmProducao || p.status === StatusProjeto.Orcamento || p.status === StatusProjeto.Aprovado,
    );
    const pendentes = orcamentos.filter((o) => o.status === 'Pendente');
    const valorProducao = emAndamento.reduce((sum, p) => sum + p.valorTotalOrcamento, 0);

    setStats({
      projetosAndamento: emAndamento.length,
      orcamentosPendentes: pendentes.length,
      conversasNaoLidas: conversas.length,
      clientesTotal: clientes.length,
      valorTotalEmProducao: valorProducao,
    });
  }, []);

  const formatarMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Olá, {auth.usuario?.nomeCompleto ?? 'usuário'} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Este é o painel inicial do seu ERP. Acompanhe os indicadores em tempo real de clientes, projetos, orçamentos e mensagens.
        </p>
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
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.projetosAndamento}</p>
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
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.orcamentosPendentes}</p>
          <p className="mt-1 text-xs text-amber-600 font-medium">Aguardando aceite do cliente</p>
        </Link>

        <Link to="/whatsapp" className="card p-5 hover:border-brand-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Conversas WhatsApp</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <MessageCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{stats.conversasNaoLidas}</p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">Para triagem e aprovação</p>
        </Link>

        <Link to="/clientes" className="card p-5 hover:border-brand-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Clientes cadastrados</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.clientesTotal}</p>
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
            to="/whatsapp"
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <MessageCircle className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">Ver Mensagens WhatsApp</span>
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
              <span className="text-sm font-semibold text-slate-800">Criar Novo Orçamento</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}

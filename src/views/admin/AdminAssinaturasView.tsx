import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { adminService } from '@/services/admin/admin.service';
import { SaaSAssinatura } from '@/types/admin';

export default function AdminAssinaturasView() {
  const [assinaturas, setAssinaturas] = useState<SaaSAssinatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const carregarAssinaturas = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await adminService.listarAssinaturas();
      if (res.succeeded && res.value) {
        setAssinaturas(res.value);
      } else {
        setErro(res.errors.join(' '));
      }
    } catch {
      setErro('Erro ao carregar assinaturas.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAssinaturas();
  }, []);

  const handleExcluirAssinatura = async (ass: SaaSAssinatura) => {
    if (!window.confirm(`Excluir definitivamente a assinatura de "${ass.tenantNome}"? Essa ação não pode ser desfeita.`)) return;
    const res = await adminService.excluirAssinatura(ass.id);
    if (!res.succeeded) { alert(res.errors.join(' ')); return; }
    await carregarAssinaturas();
  };

  const handleAlterarStatus = async (
    id: string,
    novoStatus: 'ativa' | 'suspensa' | 'cancelada' | 'pendente'
  ) => {
    let motivo: string | undefined;
    if (novoStatus === 'cancelada' || novoStatus === 'suspensa') {
      const resp = prompt(`Informe o motivo para alterar o status para "${novoStatus}":`);
      if (!resp) return;
      motivo = resp;
    }

    try {
      const res = await adminService.alterarStatusAssinatura(id, novoStatus, motivo);
      if (res.succeeded) {
        await carregarAssinaturas();
      } else {
        alert(res.errors.join(' '));
      }
    } catch {
      alert('Falha ao atualizar status da assinatura.');
    }
  };

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatarData = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  const assinaturasFiltradas = assinaturas.filter((a) => {
    const matchBusca =
      busca === '' ||
      (a.tenantNome && a.tenantNome.toLowerCase().includes(busca.toLowerCase())) ||
      (a.planoNome && a.planoNome.toLowerCase().includes(busca.toLowerCase()));
    const matchStatus = filtroStatus === 'todos' || a.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Controle de Assinaturas das Empresas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe o ciclo de faturamento, renovações, vencimentos e cancelamentos.
          </p>
        </div>
        <button
          type="button"
          onClick={carregarAssinaturas}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          Recarregar
        </button>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {erro}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por empresa ou plano..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-hidden"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 font-medium focus:border-brand-500 focus:outline-hidden"
        >
          <option value="todos">Todos os Status</option>
          <option value="ativa">Ativas</option>
          <option value="pendente">Pendentes</option>
          <option value="suspensa">Suspensas</option>
          <option value="vencida">Vencidas</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </div>

      {/* Tabela de Assinaturas */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {carregando ? (
          <div className="p-12 text-center text-xs text-slate-400">Carregando assinaturas...</div>
        ) : assinaturasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Nenhuma assinatura encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Empresa Cliente</th>
                  <th className="px-5 py-3.5">Plano Contratado</th>
                  <th className="px-5 py-3.5">Valor Recorrente</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Início</th>
                  <th className="px-5 py-3.5">Próximo Vencimento</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assinaturasFiltradas.map((ass) => (
                  <tr key={ass.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{ass.tenantNome}</div>
                      {ass.tenantDocumento && (
                        <div className="text-[11px] font-mono text-slate-400">{ass.tenantDocumento}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{ass.planoNome}</td>
                    <td className="px-5 py-4 font-bold text-slate-900 font-mono">
                      {formatarMoeda(ass.valor)}
                      <span className="text-[11px] font-normal text-slate-400">/{ass.periodicidade}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          ass.status === 'ativa'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : ass.status === 'suspensa'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                            : ass.status === 'pendente'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/50'
                            : 'bg-red-50 text-red-700 border border-red-200/50'
                        }`}
                      >
                        {ass.status === 'ativa' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : ass.status === 'suspensa' ? (
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {ass.status.charAt(0).toUpperCase() + ass.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatarData(ass.dataInicio)}</td>
                    <td className="px-5 py-4 font-mono font-medium text-slate-700">
                      {formatarData(ass.dataProximoVencimento)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ass.status !== 'ativa' && (
                          <button
                            type="button"
                            onClick={() => handleAlterarStatus(ass.id, 'ativa')}
                            className="rounded px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer"
                          >
                            Ativar
                          </button>
                        )}
                        {ass.status === 'ativa' && (
                          <button
                            type="button"
                            onClick={() => handleAlterarStatus(ass.id, 'suspensa')}
                            className="rounded px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                          >
                            Suspender
                          </button>
                        )}
                        {ass.status !== 'cancelada' && (
                          <button
                            type="button"
                            onClick={() => handleAlterarStatus(ass.id, 'cancelada')}
                            className="rounded px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                        <button type="button" title="Excluir assinatura" aria-label="Excluir assinatura" onClick={() => handleExcluirAssinatura(ass)} className="inline-flex items-center justify-center rounded p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

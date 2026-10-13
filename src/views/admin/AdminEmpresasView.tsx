import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Calendar,
  Users,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { adminService } from '@/services/admin/admin.service';
import { SaaSEmpresaItem } from '@/types/admin';

export default function AdminEmpresasView() {
  const [empresas, setEmpresas] = useState<SaaSEmpresaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPlano, setFiltroPlano] = useState<string>('todos');

  // Modal de Alteração de Status
  const [empresaSelecionada, setEmpresaSelecionada] = useState<SaaSEmpresaItem | null>(null);
  const [novoStatus, setNovoStatus] = useState<'ativo' | 'suspenso' | 'cancelado'>('ativo');
  const [motivo, setMotivo] = useState('');
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  const carregarEmpresas = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await adminService.listarEmpresas();
      if (res.succeeded && res.value) {
        setEmpresas(res.value);
      } else {
        setErro(res.errors.join(' '));
      }
    } catch {
      setErro('Erro ao carregar lista de empresas.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const abrirModalStatus = (empresa: SaaSEmpresaItem, statusDesejado: 'ativo' | 'suspenso' | 'cancelado') => {
    setEmpresaSelecionada(empresa);
    setNovoStatus(statusDesejado);
    setMotivo('');
    setModalAberto(true);
  };

  const handleSalvarStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaSelecionada) return;

    if ((novoStatus === 'suspenso' || novoStatus === 'cancelado') && !motivo.trim()) {
      alert('Por favor, informe a justificativa/motivo para auditoria.');
      return;
    }

    setSalvandoStatus(true);
    try {
      const res = await adminService.atualizarStatusEmpresa(
        empresaSelecionada.id,
        novoStatus,
        motivo.trim() || undefined
      );

      if (res.succeeded) {
        setModalAberto(false);
        await carregarEmpresas();
      } else {
        alert(res.errors.join(' '));
      }
    } catch {
      alert('Falha ao atualizar status da empresa.');
    } finally {
      setSalvandoStatus(false);
    }
  };

  const empresasFiltradas = empresas.filter((emp) => {
    const matchBusca =
      busca === '' ||
      emp.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
      (emp.nomeFantasia && emp.nomeFantasia.toLowerCase().includes(busca.toLowerCase())) ||
      (emp.documento && emp.documento.includes(busca));

    const matchStatus = filtroStatus === 'todos' || emp.status === filtroStatus;
    const matchPlano = filtroPlano === 'todos' || emp.plano === filtroPlano;

    return matchBusca && matchStatus && matchPlano;
  });

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatarData = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Empresas Clientes (Tenants)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerenciamento global de todas as marcenarias cadastradas, seus planos e controle de status.
          </p>
        </div>
        <button
          type="button"
          onClick={carregarEmpresas}
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
            placeholder="Buscar por razão social, nome fantasia ou documento..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
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
          <option value="ativo">Ativas</option>
          <option value="suspenso">Suspensas</option>
          <option value="cancelado">Canceladas</option>
        </select>

        <select
          value={filtroPlano}
          onChange={(e) => setFiltroPlano(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 font-medium focus:border-brand-500 focus:outline-hidden"
        >
          <option value="todos">Todos os Planos</option>
          <option value="Free">Plano Free</option>
          <option value="Standard">Plano Standard</option>
          <option value="Empresarial">Plano Empresarial</option>
        </select>
      </div>

      {/* Tabela de Empresas */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {carregando ? (
          <div className="p-12 text-center text-xs text-slate-400">Carregando lista de empresas...</div>
        ) : empresasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Nenhuma empresa corresponde aos filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Empresa</th>
                  <th className="px-5 py-3.5">Plano / Valor</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Usuários</th>
                  <th className="px-5 py-3.5">Próximo Vencimento</th>
                  <th className="px-5 py-3.5">Data Cadastro</th>
                  <th className="px-5 py-3.5 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {empresasFiltradas.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{emp.razaoSocial}</div>
                      {emp.nomeFantasia && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{emp.nomeFantasia}</div>
                      )}
                      {emp.documento && (
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{emp.documento}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{emp.plano}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {formatarMoeda(emp.valorAssinatura || 0)}/mês
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          emp.status === 'ativo'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : emp.status === 'suspenso'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                            : 'bg-red-50 text-red-700 border border-red-200/50'
                        }`}
                      >
                        {emp.status === 'ativo' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : emp.status === 'suspenso' ? (
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600" />
                        )}
                        {emp.status === 'ativo' ? 'Ativa' : emp.status === 'suspenso' ? 'Suspensa' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono font-medium text-slate-700">
                      {emp.totalUsuarios}
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-mono">
                      {emp.dataVencimento ? formatarData(emp.dataVencimento) : '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatarData(emp.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {emp.status !== 'ativo' && (
                          <button
                            type="button"
                            onClick={() => abrirModalStatus(emp, 'ativo')}
                            className="rounded px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer"
                          >
                            Ativar
                          </button>
                        )}
                        {emp.status === 'ativo' && (
                          <button
                            type="button"
                            onClick={() => abrirModalStatus(emp, 'suspenso')}
                            className="rounded px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                          >
                            Suspender
                          </button>
                        )}
                        {emp.status !== 'cancelado' && (
                          <button
                            type="button"
                            onClick={() => abrirModalStatus(emp, 'cancelado')}
                            className="rounded px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Alteração de Status */}
      {modalAberto && empresaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  novoStatus === 'ativo'
                    ? 'bg-emerald-50 text-emerald-600'
                    : novoStatus === 'suspenso'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {novoStatus === 'ativo'
                    ? 'Reativar Empresa'
                    : novoStatus === 'suspenso'
                    ? 'Suspender Acesso da Empresa'
                    : 'Cancelar Empresa no SaaS'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{empresaSelecionada.razaoSocial}</p>
              </div>
            </div>

            <form onSubmit={handleSalvarStatus} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                {novoStatus === 'ativo'
                  ? 'A empresa voltará a ter acesso irrestrito ao painel e seus módulos.'
                  : novoStatus === 'suspenso'
                  ? 'O acesso de todos os usuários vinculados a esta empresa será bloqueado até a reativação manual ou regularização financeira.'
                  : 'A empresa será marcada como cancelada e seu contrato de assinatura será encerrado no banco.'}
              </p>

              {(novoStatus === 'suspenso' || novoStatus === 'cancelado') && (
                <div>
                  <label htmlFor="motivo" className="block text-xs font-semibold text-slate-700 mb-1">
                    Justificativa / Motivo da Operação *
                  </label>
                  <textarea
                    id="motivo"
                    rows={3}
                    placeholder="Ex.: Inadimplência da mensalidade de setembro; Solicitação formal via e-mail..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Este motivo será gravado no log de auditoria permanente.</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoStatus}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer ${
                    novoStatus === 'ativo'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : novoStatus === 'suspenso'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {salvandoStatus ? 'Processando...' : 'Confirmar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

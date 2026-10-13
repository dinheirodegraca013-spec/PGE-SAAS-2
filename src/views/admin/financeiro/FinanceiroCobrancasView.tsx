import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '@/services/admin/admin.service';
import { SaaSCobranca, SaaSEmpresaItem } from '@/types/admin';

export default function FinanceiroCobrancasView() {
  const [cobrancas, setCobrancas] = useState<SaaSCobranca[]>([]);
  const [empresas, setEmpresas] = useState<SaaSEmpresaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Modal Nova Cobrança
  const [modalAberto, setModalAberto] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [valor, setValor] = useState(89.9);
  const [dataVencimento, setDataVencimento] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [descricao, setDescricao] = useState('Mensalidade PGE SAAS 2');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [resCob, resEmp] = await Promise.all([
        adminService.listarCobrancas(),
        adminService.listarEmpresas(),
      ]);

      if (resCob.succeeded && resCob.value) {
        setCobrancas(resCob.value);
      } else {
        setErro(resCob.errors.join(' '));
      }

      if (resEmp.succeeded && resEmp.value) {
        setEmpresas(resEmp.value);
        if (resEmp.value.length > 0) {
          setTenantId(resEmp.value[0].id);
        }
      }
    } catch {
      setErro('Erro ao listar cobranças financeiras.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCriarCobranca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      alert('Selecione a empresa cliente.');
      return;
    }

    setSalvando(true);
    try {
      const res = await adminService.criarCobranca({
        tenantId,
        valor,
        dataVencimento: new Date(dataVencimento).toISOString(),
        descricao,
        observacoes,
        status: 'pendente',
      });

      if (res.succeeded) {
        setModalAberto(false);
        await carregarDados();
      } else {
        alert(res.errors.join(' '));
      }
    } catch {
      alert('Falha ao emitir cobrança.');
    } finally {
      setSalvando(false);
    }
  };

  const copiarLink = (texto?: string) => {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    alert('Link de pagamento copiado com sucesso!');
  };

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatarData = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  const cobrancasFiltradas = cobrancas.filter((cob) => {
    const matchBusca =
      busca === '' ||
      (cob.tenantNome && cob.tenantNome.toLowerCase().includes(busca.toLowerCase())) ||
      (cob.descricao && cob.descricao.toLowerCase().includes(busca.toLowerCase()));
    const matchStatus = filtroStatus === 'todos' || cob.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Faturas & Cobranças Emitidas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle de cobranças avulsas e recorrentes emitidas para as marcenarias parceiras.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Emitir Nova Cobrança
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
            placeholder="Buscar por empresa ou descrição da fatura..."
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
          <option value="pendente">Pendentes</option>
          <option value="paga">Pagas</option>
          <option value="vencida">Vencidas</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </div>

      {/* Tabela de Cobranças */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {carregando ? (
          <div className="p-12 text-center text-xs text-slate-400">Carregando cobranças...</div>
        ) : cobrancasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Nenhuma fatura encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Empresa Cliente</th>
                  <th className="px-5 py-3.5">Descrição</th>
                  <th className="px-5 py-3.5">Valor</th>
                  <th className="px-5 py-3.5">Vencimento</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Provedor</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {cobrancasFiltradas.map((cob) => (
                  <tr key={cob.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">{cob.tenantNome}</td>
                    <td className="px-5 py-4 text-slate-700">{cob.descricao}</td>
                    <td className="px-5 py-4 font-bold text-slate-900 font-mono">
                      {formatarMoeda(cob.valor)}
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-mono">
                      {formatarData(cob.dataVencimento)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          cob.status === 'paga'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : cob.status === 'vencida'
                            ? 'bg-red-50 text-red-700 border border-red-200/50'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                        }`}
                      >
                        {cob.status === 'paga' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : cob.status === 'vencida' ? (
                          <AlertCircle className="h-3 w-3 text-red-600" />
                        ) : (
                          <Clock className="h-3 w-3 text-amber-600" />
                        )}
                        {cob.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 font-mono">{cob.provedor}</td>
                    <td className="px-5 py-4 text-right">
                      {cob.linkPagamentoUtilizado ? (
                        <button
                          type="button"
                          onClick={() => copiarLink(cob.linkPagamentoUtilizado)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          Copiar Link
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Manual</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Emitir Cobrança */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Emitir Nova Cobrança</h3>
            <p className="text-xs text-slate-500 mb-4">Gere uma nova fatura com vencimento e valor especificados.</p>

            <form onSubmit={handleCriarCobranca} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Empresa Cliente (Tenant) *
                </label>
                <select
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                >
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.razaoSocial} ({emp.plano})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={valor}
                    onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição da Cobrança *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Mensalidade Standard - Outubro"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Internas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Instruções ou notas da equipe"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                >
                  {salvando ? 'Emitindo...' : 'Salvar e Emitir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

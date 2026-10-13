import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Clock,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { adminService } from '@/services/admin/admin.service';
import { SaaSPagamento, SaaSEmpresaItem, SaaSCobranca } from '@/types/admin';

export default function FinanceiroPagamentosView() {
  const [pagamentos, setPagamentos] = useState<SaaSPagamento[]>([]);
  const [empresas, setEmpresas] = useState<SaaSEmpresaItem[]>([]);
  const [cobrancas, setCobrancas] = useState<SaaSCobranca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroConferencia, setFiltroConferencia] = useState<string>('todos');

  // Modal Registrar Pagamento Manual
  const [modalAberto, setModalAberto] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [cobrancaId, setCobrancaId] = useState('');
  const [valor, setValor] = useState(89.9);
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formaPagamento, setFormaPagamento] = useState<
    'PIX' | 'Boleto' | 'Cartao' | 'Transferencia' | 'Dinheiro' | 'Outro'
  >('PIX');
  const [comprovanteReferencia, setComprovanteReferencia] = useState('');
  const [descontoAjuste, setDescontoAjuste] = useState(0);
  const [conferidoManualmente, setConferidoManualmente] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [resPag, resEmp, resCob] = await Promise.all([
        adminService.listarPagamentos(),
        adminService.listarEmpresas(),
        adminService.listarCobrancas(),
      ]);

      if (resPag.succeeded && resPag.value) {
        setPagamentos(resPag.value);
      } else {
        setErro(resPag.errors.join(' '));
      }

      if (resEmp.succeeded && resEmp.value) {
        setEmpresas(resEmp.value);
        if (resEmp.value.length > 0) {
          setTenantId(resEmp.value[0].id);
        }
      }

      if (resCob.succeeded && resCob.value) {
        setCobrancas(resCob.value);
      }
    } catch {
      setErro('Erro ao carregar lista de pagamentos.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleRegistrarPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      alert('Selecione a empresa associada.');
      return;
    }

    setSalvando(true);
    try {
      const res = await adminService.registrarPagamentoManual({
        tenantId,
        cobrancaId: cobrancaId || undefined,
        valor,
        dataPagamento: new Date(dataPagamento).toISOString(),
        formaPagamento,
        comprovanteReferencia: comprovanteReferencia.trim() || undefined,
        descontoAjuste,
        conferidoManualmente,
      });

      if (res.succeeded) {
        setModalAberto(false);
        setComprovanteReferencia('');
        setDescontoAjuste(0);
        await carregarDados();
      } else {
        alert(res.errors.join(' '));
      }
    } catch {
      alert('Falha ao registrar pagamento manual.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAlternarConferencia = async (id: string, estadoAtual: boolean) => {
    try {
      const res = await adminService.alternarConferenciaPagamento(id, !estadoAtual);
      if (res.succeeded) {
        await carregarDados();
      } else {
        alert(res.errors.join(' '));
      }
    } catch {
      alert('Erro ao atualizar conferência.');
    }
  };

  const handleEstornar = async (id: string) => {
    const motivo = prompt('Informe a justificativa/motivo do estorno do pagamento:');
    if (!motivo) return;

    try {
      const res = await adminService.estornarPagamento(id, motivo);
      if (res.succeeded) {
        await carregarDados();
      } else {
        alert(res.errors.join(' '));
      }
    } catch {
      alert('Erro ao processar estorno.');
    }
  };

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatarData = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  const pagamentosFiltrados = pagamentos.filter((pag) => {
    const matchBusca =
      busca === '' ||
      (pag.tenantNome && pag.tenantNome.toLowerCase().includes(busca.toLowerCase())) ||
      (pag.comprovanteReferencia && pag.comprovanteReferencia.toLowerCase().includes(busca.toLowerCase()));

    const matchStatus = filtroStatus === 'todos' || pag.status === filtroStatus;
    const matchConf =
      filtroConferencia === 'todos' ||
      (filtroConferencia === 'conferido' && pag.conferidoManualmente) ||
      (filtroConferencia === 'pendente' && !pag.conferidoManualmente);

    return matchBusca && matchStatus && matchConf;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pagamentos & Conciliação Manual
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro manual de pagamentos (PIX, TED, Boleto), conciliação com extrato bancário e controle de estornos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Registrar Pagamento Manual
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
            placeholder="Buscar por empresa ou comprovante/código..."
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
          <option value="confirmado">Confirmados</option>
          <option value="estornado">Estornados</option>
          <option value="pendente">Pendentes</option>
        </select>

        <select
          value={filtroConferencia}
          onChange={(e) => setFiltroConferencia(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 font-medium focus:border-brand-500 focus:outline-hidden"
        >
          <option value="todos">Toda a Conferência</option>
          <option value="conferido">Conferidos Manualmente</option>
          <option value="pendente">Pendente de Conferência</option>
        </select>
      </div>

      {/* Tabela de Pagamentos */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {carregando ? (
          <div className="p-12 text-center text-xs text-slate-400">Carregando pagamentos...</div>
        ) : pagamentosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Nenhum pagamento encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Empresa Cliente</th>
                  <th className="px-5 py-3.5">Valor Liquidado</th>
                  <th className="px-5 py-3.5">Forma / Provedor</th>
                  <th className="px-5 py-3.5">Data Pagamento</th>
                  <th className="px-5 py-3.5">Comprovante / Referência</th>
                  <th className="px-5 py-3.5">Conferência Manual</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pagamentosFiltrados.map((pag) => (
                  <tr key={pag.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">{pag.tenantNome}</td>
                    <td className="px-5 py-4 font-bold text-emerald-700 font-mono">
                      {formatarMoeda(pag.valor)}
                      {pag.descontoAjuste > 0 && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Desc: {formatarMoeda(pag.descontoAjuste)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-800">{pag.formaPagamento}</span>
                      <span className="text-[11px] text-slate-400 font-mono block">{pag.provedor}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-mono">
                      {formatarData(pag.dataPagamento)}
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-mono text-[11px]">
                      {pag.comprovanteReferencia || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => handleAlternarConferencia(pag.id, pag.conferidoManualmente)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                          pag.conferidoManualmente
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/50 hover:bg-amber-100'
                        }`}
                        title="Clique para alternar o status da conferência"
                      >
                        {pag.conferidoManualmente ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Clock className="h-3 w-3 text-amber-600" />
                        )}
                        {pag.conferidoManualmente ? 'Conferido' : 'Pendente'}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-[11px] font-semibold ${
                          pag.status === 'confirmado'
                            ? 'text-emerald-700'
                            : pag.status === 'estornado'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {pag.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {pag.status === 'confirmado' && (
                        <button
                          type="button"
                          onClick={() => handleEstornar(pag.id)}
                          className="rounded px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          Estornar
                        </button>
                      )}
                      {pag.status === 'estornado' && (
                        <span className="text-[11px] text-slate-400 italic">Estornado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Pagamento Manual */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Registrar Pagamento Manual</h3>
            <p className="text-xs text-slate-500 mb-4">
              Vincule uma liquidação manual direta para uma marcenaria, renovando a assinatura ou liquidando fatura.
            </p>

            <form onSubmit={handleRegistrarPagamento} className="space-y-4">
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vincular a uma Cobrança Existente (Opcional)
                </label>
                <select
                  value={cobrancaId}
                  onChange={(e) => setCobrancaId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                >
                  <option value="">Nenhuma (Entrada direta / avulsa)</option>
                  {cobrancas
                    .filter((c) => c.status === 'pendente' || c.status === 'vencida')
                    .map((cob) => (
                      <option key={cob.id} value={cob.id}>
                        {cob.tenantNome} — {cob.descricao} (R$ {cob.valor.toFixed(2)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Pago (R$) *
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
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  >
                    <option value="PIX">PIX (Banco / Chave)</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Cartao">Cartão de Crédito/Débito</option>
                    <option value="Transferencia">Transferência TED/DOC</option>
                    <option value="Dinheiro">Dinheiro em Espécie</option>
                    <option value="Outro">Outro Provedor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Desconto / Ajuste (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={descontoAjuste}
                    onChange={(e) => setDescontoAjuste(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Comprovante / Código de Transação / ID
                </label>
                <input
                  type="text"
                  placeholder="Ex.: E123456782026101300000000; TED 98765..."
                  value={comprovanteReferencia}
                  onChange={(e) => setComprovanteReferencia(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="conferido"
                  type="checkbox"
                  checked={conferidoManualmente}
                  onChange={(e) => setConferidoManualmente(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="conferido" className="text-xs font-medium text-slate-700">
                  Marcar como conferido manualmente pelo operador agora
                </label>
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
                  {salvando ? 'Gravando...' : 'Confirmar e Liquidar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

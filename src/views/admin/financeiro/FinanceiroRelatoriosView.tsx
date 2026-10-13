import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  RefreshCw,
  Search,
} from 'lucide-react';
import { adminService } from '@/services/admin/admin.service';
import { SaaSPagamento, SaaSEmpresaItem } from '@/types/admin';

export default function FinanceiroRelatoriosView() {
  const [pagamentos, setPagamentos] = useState<SaaSPagamento[]>([]);
  const [empresas, setEmpresas] = useState<SaaSEmpresaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [periodo, setPeriodo] = useState<'30dias' | 'mesAtual' | 'anoAtual' | 'todos'>('mesAtual');
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('todas');
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');
  const [formaFiltro, setFormaFiltro] = useState<string>('todas');

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [resPag, resEmp] = await Promise.all([
        adminService.listarPagamentos(),
        adminService.listarEmpresas(),
      ]);

      if (resPag.succeeded && resPag.value) {
        setPagamentos(resPag.value);
      } else {
        setErro(resPag.errors.join(' '));
      }

      if (resEmp.succeeded && resEmp.value) {
        setEmpresas(resEmp.value);
      }
    } catch {
      setErro('Erro ao carregar dados do relatório financeiro.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatarData = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  const pagamentosFiltrados = pagamentos.filter((p) => {
    // Filtro Período
    const dataPag = new Date(p.dataPagamento);
    const agora = new Date();

    if (periodo === '30dias') {
      const limite = new Date();
      limite.setDate(limite.getDate() - 30);
      if (dataPag < limite) return false;
    } else if (periodo === 'mesAtual') {
      if (dataPag.getMonth() !== agora.getMonth() || dataPag.getFullYear() !== agora.getFullYear()) {
        return false;
      }
    } else if (periodo === 'anoAtual') {
      if (dataPag.getFullYear() !== agora.getFullYear()) {
        return false;
      }
    }

    if (empresaFiltro !== 'todas' && p.tenantId !== empresaFiltro) {
      return false;
    }

    if (statusFiltro !== 'todos' && p.status !== statusFiltro) {
      return false;
    }

    if (formaFiltro !== 'todas' && p.formaPagamento !== formaFiltro) {
      return false;
    }

    return true;
  });

  // Métricas calculadas sobre os pagamentos filtrados
  const totalRecebido = pagamentosFiltrados
    .filter((p) => p.status === 'confirmado')
    .reduce((sum, p) => sum + p.valor, 0);

  const qtdConfirmados = pagamentosFiltrados.filter((p) => p.status === 'confirmado').length;
  const ticketMedio = qtdConfirmados > 0 ? totalRecebido / qtdConfirmados : 0;
  const totalDescontos = pagamentosFiltrados.reduce((sum, p) => sum + (p.descontoAjuste || 0), 0);

  // Exportação para CSV
  const exportarCSV = () => {
    if (pagamentosFiltrados.length === 0) {
      alert('Não há dados para exportar com os filtros atuais.');
      return;
    }

    const cabecalho = [
      'Data Pagamento',
      'Empresa / Tenant',
      'Valor (R$)',
      'Desconto/Ajuste (R$)',
      'Forma Pagamento',
      'Status',
      'Provedor',
      'Referencia / Comprovante',
      'Conferido Manualmente',
    ];

    const linhas = pagamentosFiltrados.map((p) => [
      formatarData(p.dataPagamento),
      `"${p.tenantNome?.replace(/"/g, '""') || 'Empresa'}"`,
      p.valor.toFixed(2),
      (p.descontoAjuste || 0).toFixed(2),
      p.formaPagamento,
      p.status,
      p.provedor || 'Manual',
      `"${(p.comprovanteReferencia || '').replace(/"/g, '""')}"`,
      p.conferidoManualmente ? 'Sim' : 'Nao',
    ]);

    const csvContent =
      '\uFEFF' + // BOM para compatibilidade com Excel
      [cabecalho.join(';'), ...linhas.map((e) => e.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_financeiro_saas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Relatórios Financeiros do SaaS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Análise consolidada de faturamento, liquidações, formas de pagamento e exportação oficial em CSV.
          </p>
        </div>
        <button
          type="button"
          onClick={exportarCSV}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar Relatório CSV
        </button>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {erro}
        </div>
      )}

      {/* Filtros de Período e Critérios */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Período de Análise</label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-700 font-medium focus:border-brand-500 focus:outline-hidden"
            >
              <option value="mesAtual">Mês Atual</option>
              <option value="30dias">Últimos 30 Dias</option>
              <option value="anoAtual">Ano Atual</option>
              <option value="todos">Todo o Histórico</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Empresa / Tenant</label>
            <select
              value={empresaFiltro}
              onChange={(e) => setEmpresaFiltro(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-700 font-medium focus:border-brand-500 focus:outline-hidden"
            >
              <option value="todas">Todas as Empresas</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.razaoSocial}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Status da Liquidação</label>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-700 font-medium focus:border-brand-500 focus:outline-hidden"
            >
              <option value="todos">Todos os Status</option>
              <option value="confirmado">Confirmados</option>
              <option value="estornado">Estornados</option>
              <option value="pendente">Pendentes</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Forma de Pagamento</label>
            <select
              value={formaFiltro}
              onChange={(e) => setFormaFiltro(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-700 font-medium focus:border-brand-500 focus:outline-hidden"
            >
              <option value="todas">Todas as Formas</option>
              <option value="PIX">PIX</option>
              <option value="Boleto">Boleto Bancário</option>
              <option value="Cartao">Cartão de Crédito</option>
              <option value="Transferencia">Transferência</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards com Indicadores Calculados sobre o Filtro */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Liquidado</span>
          <span className="text-xl font-extrabold text-emerald-700 block mt-1">
            {formatarMoeda(totalRecebido)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{qtdConfirmados} pagamentos confirmados</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Ticket Médio</span>
          <span className="text-xl font-extrabold text-slate-900 block mt-1">
            {formatarMoeda(ticketMedio)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Média por liquidação</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total de Descontos</span>
          <span className="text-xl font-extrabold text-amber-700 block mt-1">
            {formatarMoeda(totalDescontos)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Ajustes concedidos</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Lançamentos</span>
          <span className="text-xl font-extrabold text-indigo-700 block mt-1">
            {pagamentosFiltrados.length}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Registros no relatório</span>
        </div>
      </div>

      {/* Tabela do Relatório */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Empresa Cliente</th>
                <th className="px-5 py-3.5">Valor Liquidado</th>
                <th className="px-5 py-3.5">Desconto</th>
                <th className="px-5 py-3.5">Forma</th>
                <th className="px-5 py-3.5">Comprovante / Código</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Conferência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pagamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    Nenhum lançamento corresponde aos filtros selecionados.
                  </td>
                </tr>
              ) : (
                pagamentosFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 text-slate-600 font-mono">{formatarData(p.dataPagamento)}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{p.tenantNome}</td>
                    <td className="px-5 py-3.5 font-bold text-emerald-700 font-mono">
                      {formatarMoeda(p.valor)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono">
                      {p.descontoAjuste > 0 ? formatarMoeda(p.descontoAjuste) : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{p.formaPagamento}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                      {p.comprovanteReferencia || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[11px] font-semibold ${
                          p.status === 'confirmado'
                            ? 'text-emerald-700'
                            : p.status === 'estornado'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[11px] font-medium ${
                          p.conferidoManualmente ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {p.conferidoManualmente ? '✓ Conferido' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

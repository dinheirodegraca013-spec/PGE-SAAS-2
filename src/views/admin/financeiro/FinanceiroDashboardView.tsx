import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  Receipt,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  RefreshCw,
  Building2,
  Calendar,
} from "lucide-react";
import { adminService } from "@/services/admin/admin.service";
import { SaaSCobranca, SaaSPagamento } from "@/types/admin";

export default function FinanceiroDashboardView() {
  const [metricas, setMetricas] = useState<any>(null);
  const [cobrancas, setCobrancas] = useState<SaaSCobranca[]>([]);
  const [pagamentos, setPagamentos] = useState<SaaSPagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarFinanceiro = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [resMetricas, resCobrancas, resPagamentos] = await Promise.all([
        adminService.obterMetricasGerais(),
        adminService.listarCobrancas(),
        adminService.listarPagamentos(),
      ]);

      if (resMetricas.succeeded && resMetricas.value) {
        setMetricas(resMetricas.value);
      }
      if (resCobrancas.succeeded && resCobrancas.value) {
        setCobrancas(resCobrancas.value);
      }
      if (resPagamentos.succeeded && resPagamentos.value) {
        setPagamentos(resPagamentos.value);
      }
    } catch {
      setErro("Erro ao carregar dados do painel financeiro.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarFinanceiro();
  }, []);

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatarData = (iso: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR");
  };

  const formatarMetrica = (valor: unknown) => {
    if (carregando || erro || !metricas) return "—";
    const numero = Number(valor);
    return Number.isFinite(numero) ? formatarMoeda(numero) : "—";
  };

  const pagamentosPendentesConferencia = pagamentos.filter(
    (p) => !p.conferidoManualmente,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Painel Financeiro do SaaS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de cobranças, recebíveis, conciliação manual de pagamentos e
            relatórios de fluxo de caixa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void carregarFinanceiro()}
            disabled={carregando}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
          <Link
            to="/admin/financeiro/pagamentos"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Registrar Pagamento Manual
          </Link>
          <Link
            to="/admin/financeiro/relatorios"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
            Exportar Relatório CSV
          </Link>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {erro}
        </div>
      )}

      {/* Cards Financeiros Principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Recebido */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Liquidado
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-700">
              {formatarMetrica(metricas?.receitaRecebidaPeriodo)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Pagamentos confirmados na plataforma
            </p>
          </div>
        </div>

        {/* Faturas Pendentes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cobranças a Vencer
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">
              {formatarMetrica(metricas?.valoresPendentes)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Faturas emitidas aguardando pagamento
            </p>
          </div>
        </div>

        {/* Inadimplência Vencida */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Inadimplência Vencida
            </span>
            <div className="rounded-lg bg-red-50 p-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-red-700">
              {formatarMetrica(metricas?.inadimplenciaValor)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Faturas com prazo de vencimento expirado
            </p>
          </div>
        </div>

        {/* Conferência Manual */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Conferência Manual
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-amber-700">
              {carregando || erro ? "—" : pagamentosPendentesConferencia.length}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Pagamentos que exigem validação do auditor
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Ações e Próximos Vencimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas Cobranças a Vencer */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cobranças Recentes / Próximos Vencimentos
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Faturas emitidas para os clientes do SaaS.
              </p>
            </div>
            <Link
              to="/admin/financeiro/cobrancas"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Ver Todas ({cobrancas.length})
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {cobrancas.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Nenhuma cobrança registrada.
              </p>
            ) : (
              cobrancas.slice(0, 5).map((cob) => (
                <div
                  key={cob.id}
                  className="py-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {cob.tenantNome}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Vencimento: {formatarData(cob.dataVencimento)} ·{" "}
                      {cob.descricao}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 block">
                      {formatarMoeda(cob.valor)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        cob.status === "paga"
                          ? "text-emerald-600"
                          : cob.status === "vencida"
                            ? "text-red-600"
                            : "text-amber-600"
                      }`}
                    >
                      {cob.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimos Pagamentos Liquidados */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Últimos Pagamentos Confirmados
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Entradas em conta conciliadas e comprovadas.
              </p>
            </div>
            <Link
              to="/admin/financeiro/pagamentos"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Ver Todos ({pagamentos.length})
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {pagamentos.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Nenhum pagamento liquidado ainda.
              </p>
            ) : (
              pagamentos.slice(0, 5).map((pag) => (
                <div
                  key={pag.id}
                  className="py-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {pag.tenantNome}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {pag.formaPagamento} · Liquidado em{" "}
                      {formatarData(pag.dataPagamento)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 block">
                      {formatarMoeda(pag.valor)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {pag.conferidoManualmente
                        ? "✓ Conferido"
                        : "Pendente conferência"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

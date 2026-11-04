import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Package,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Shield,
  RefreshCw,
} from "lucide-react";
import { adminService } from "@/services/admin/admin.service";
import { SaaSEmpresaItem, SaaSAuditLog } from "@/types/admin";

export default function AdminDashboardView() {
  const [metricas, setMetricas] = useState<any>(null);
  const [empresas, setEmpresas] = useState<SaaSEmpresaItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<SaaSAuditLog[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [resMetricas, resEmpresas, resLogs] = await Promise.all([
        adminService.obterMetricasGerais(),
        adminService.listarEmpresas(),
        adminService.listarAuditLogs(undefined, 8),
      ]);

      if (resMetricas.succeeded && resMetricas.value) {
        setMetricas(resMetricas.value);
      } else {
        setErro(resMetricas.errors.join(" "));
      }

      if (resEmpresas.succeeded && resEmpresas.value) {
        setEmpresas(resEmpresas.value);
      }

      if (resLogs.succeeded && resLogs.value) {
        setAuditLogs(resLogs.value);
      }
    } catch {
      setErro("Erro ao comunicar com o banco de dados do Supabase.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const moedaDisponivel = (valor: unknown) =>
    typeof valor === "number" && Number.isFinite(valor)
      ? formatarMoeda(valor)
      : "—";

  const numeroDisponivel = (valor: unknown) =>
    typeof valor === "number" && Number.isFinite(valor) ? String(valor) : "—";

  const formatarData = (iso: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">
            Carregando indicadores do SaaS...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard Administrativo do SaaS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visão consolidada de todas as marcenarias, planos ativos, usuários e
            métricas em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregarDados}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            Atualizar Métricas
          </button>
          <Link
            to="/admin/financeiro"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Acessar Financeiro
          </Link>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{erro}</span>
        </div>
      )}

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* MRR Estimado */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              MRR Estimado
            </span>
            <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">
              {moedaDisponivel(metricas?.mrrEstimado)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Receita recorrente mensal contratada
            </p>
          </div>
        </div>

        {/* Empresas Cadastradas */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Empresas (Tenants)
            </span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">
              {numeroDisponivel(metricas?.totalEmpresas)}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-600 font-semibold">
                {numeroDisponivel(metricas?.empresasAtivas)} ativas
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-amber-600 font-semibold">
                {numeroDisponivel(metricas?.empresasSuspensas)} suspensas
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Marcenarias e clientes da plataforma
          </p>
        </div>

        {/* Receita Recebida */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Receita Recebida
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-700">
              {moedaDisponivel(metricas?.receitaRecebidaPeriodo)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Pagamentos liquidados e confirmados
            </p>
          </div>
        </div>

        {/* Valores Pendentes / Inadimplência */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pendências & Vencidos
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-amber-700">
              {moedaDisponivel(metricas?.valoresPendentes)}
            </span>
            <p className="text-[11px] text-red-600 font-medium mt-1">
              Inadimplência vencida:{" "}
              {moedaDisponivel(metricas?.inadimplenciaValor)}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Distribuição de Planos & Assinaturas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição por Plano */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Assinaturas por Plano
            </h3>
            <Link
              to="/admin/planos"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Gerenciar Planos
            </Link>
          </div>

          <div className="space-y-4">
            {["Básico", "Profissional", "Premium/Plus"].map((planoKey) => {
              const countValue = metricas?.distribuicaoPlanos?.[planoKey];
              const count =
                typeof countValue === "number" && Number.isFinite(countValue)
                  ? countValue
                  : null;
              const total =
                typeof metricas?.totalEmpresas === "number" &&
                metricas.totalEmpresas > 0
                  ? metricas.totalEmpresas
                  : null;
              const percent =
                count !== null && total !== null
                  ? Math.round((count / total) * 100)
                  : null;
              const preco = metricas?.precosPlanos?.[planoKey];
              const valorRef =
                preco === null || preco === undefined
                  ? "Preço indisponível"
                  : preco === 0
                    ? "Gratuito"
                    : `${formatarMoeda(preco)}/mês`;

              return (
                <div key={planoKey} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {planoKey}{" "}
                      <span className="text-slate-400 font-normal">
                        ({valorRef})
                      </span>
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      {count === null ? "—" : `${count} (${percent}%)`}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        planoKey === "Premium/Plus"
                          ? "bg-purple-600"
                          : planoKey === "Profissional"
                            ? "bg-brand-600"
                            : "bg-slate-400"
                      }`}
                      style={{ width: `${percent ?? 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total de usuários registrados:</span>
            <span className="font-mono font-bold text-slate-800">
              {numeroDisponivel(metricas?.totalUsuarios)}
            </span>
          </div>
        </div>

        {/* Status das Assinaturas */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Status Geral das Contas
            </h3>
            <Link
              to="/admin/assinaturas"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Ver Assinaturas
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3">
              <span className="block text-[11px] font-semibold text-emerald-800">
                Assinaturas Ativas
              </span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block">
                {numeroDisponivel(
                  metricas?.assinaturasAtivas ?? metricas?.empresasAtivas,
                )}
              </span>
            </div>
            <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3">
              <span className="block text-[11px] font-semibold text-amber-800">
                Pendentes
              </span>
              <span className="text-xl font-bold text-amber-700 mt-1 block">
                {numeroDisponivel(metricas?.assinaturasPendentes)}
              </span>
            </div>
            <div className="rounded-lg bg-red-50/60 border border-red-100 p-3">
              <span className="block text-[11px] font-semibold text-red-800">
                Vencidas
              </span>
              <span className="text-xl font-bold text-red-700 mt-1 block">
                {numeroDisponivel(metricas?.assinaturasVencidas)}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <span className="block text-[11px] font-semibold text-slate-700">
                Canceladas
              </span>
              <span className="text-xl font-bold text-slate-600 mt-1 block">
                {numeroDisponivel(
                  metricas?.assinaturasCanceladas ??
                    metricas?.empresasCanceladas,
                )}
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400 leading-relaxed">
            As contas com assinaturas canceladas ou suspensas são bloqueadas
            automaticamente pelo RLS do banco de dados.
          </p>
        </div>

        {/* Ações Administrativas Rápidas */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Painéis & Ações Globais
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Atalhos rápidos para operações restritas do Super Admin.
            </p>
            <div className="space-y-2">
              <Link
                to="/admin/empresas"
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <span>Cadastros de Empresas</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <Link
                to="/admin/usuarios"
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-brand-600" />
                  <span>Equipe & Permissões Internas</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
              <Link
                to="/admin/financeiro/pagamentos"
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span>Registrar Pagamento Manual</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Segurança multi-tenant ativa com isolamento por RLS.</span>
          </div>
        </div>
      </div>

      {/* Tabela de Empresas Recentes */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Empresas Cadastradas Recentemente
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visão rápida das últimas marcenarias que ingressaram no SaaS.
            </p>
          </div>
          <Link
            to="/admin/empresas"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>Ver todas as empresas ({empresas.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3">Empresa / Razão Social</th>
                <th className="px-6 py-3">Plano</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Usuários</th>
                <th className="px-6 py-3">Valor Assinatura</th>
                <th className="px-6 py-3">Data Ingresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {empresas.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-400"
                  >
                    Nenhuma empresa encontrada no banco de dados.
                  </td>
                </tr>
              ) : (
                empresas.slice(0, 5).map((empresa) => (
                  <tr
                    key={empresa.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      <div>{empresa.razaoSocial}</div>
                      {empresa.documento && (
                        <div className="text-[11px] font-mono text-slate-400 font-normal">
                          {empresa.documento}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-medium text-slate-700">
                        {empresa.plano}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          empresa.status === "ativo"
                            ? "text-emerald-700"
                            : empresa.status === "suspenso"
                              ? "text-amber-700"
                              : "text-red-700"
                        }`}
                      >
                        {empresa.status === "ativo" ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {empresa.status === "ativo"
                          ? "Ativa"
                          : empresa.status === "suspenso"
                            ? "Suspensa"
                            : "Cancelada"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-600">
                      {empresa.totalUsuarios}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">
                      {formatarMoeda(empresa.valorAssinatura || 0)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {formatarData(empresa.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs de Auditoria Recentes */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1">
          Últimas Operações Registradas (Auditoria)
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Trilha de auditoria obrigatória de alterações administrativas e
          financeiras no SaaS.
        </p>

        <div className="divide-y divide-slate-100">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">
              Nenhuma atividade registrada ainda.
            </p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] font-bold text-brand-700 uppercase bg-brand-50 px-2 py-0.5 rounded">
                    {log.modulo}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {log.acao}
                  </span>
                  <span className="text-slate-400">por {log.usuarioEmail}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatarData(log.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


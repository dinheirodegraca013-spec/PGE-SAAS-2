import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  RefreshCw,
  FileText,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentTenantId } from "@/services/api/client";
import { projetosService } from "@/modules/furniture/services/projetos.service";
import type { ProjetoMovelPlanejado } from "@/modules/furniture/types/projeto";

const moeda = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );

export default function FinanceiroEmpresaView() {
  const [projetos, setProjetos] = useState<ProjetoMovelPlanejado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [lancamentosDisponiveis, setLancamentosDisponiveis] = useState(false);
  const [tipo, setTipo] = useState("despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [receitas, setReceitas] = useState<number | null>(null);
  const [despesas, setDespesas] = useState<number | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    setLancamentosDisponiveis(false);
    try {
      const resultado = await projetosService.listar();
      if (!resultado.succeeded)
        throw new Error(
          resultado.errors.join(" ") || "Falha ao carregar projetos.",
        );
      setProjetos(resultado.value?.items || []);
      const tenantId = getCurrentTenantId();
      if (!tenantId) {
        throw new Error("Sessão sem empresa vinculada. Faça login novamente.");
      }
      let lancamentosQuery = supabase
        .from("financeiro_lancamentos")
        .select("id,tipo,descricao,valor,vencimento,status")
        .order("vencimento", { ascending: false });
      lancamentosQuery = lancamentosQuery.eq("tenant_id", tenantId);
      const { data: lista, error: listaErro } = await lancamentosQuery;
      if (listaErro) throw listaErro;
      setLancamentos(lista || []);
      setLancamentosDisponiveis(true);
      const { data: resumo, error: resumoErro } = await supabase.rpc(
        "financeiro_resumo_baixas",
      );
      if (resumoErro) {
        setReceitas(null);
        setDespesas(null);
      } else {
        const totais = Array.isArray(resumo) ? resumo[0] : resumo;
        const totalReceitas = Number(totais?.receitas);
        const totalDespesas = Number(totais?.despesas);
        setReceitas(
          Number.isFinite(totalReceitas) && totalReceitas >= 0
            ? totalReceitas
            : null,
        );
        setDespesas(
          Number.isFinite(totalDespesas) && totalDespesas >= 0
            ? totalDespesas
            : null,
        );
      }
    } catch (e) {
      setProjetos([]);
      setErro(e instanceof Error ? e.message : "Falha na consulta financeira.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const projetosValidos = useMemo(
    () =>
      projetos.map((p) => ({
        id: p.id,
        titulo: p.titulo || "Projeto sem título",
        status: String(p.status || "Não informado"),
        valor: Math.max(0, Number(p.valorTotalOrcamento) || 0),
      })),
    [projetos],
  );
  const valorOrcado = projetosValidos.reduce((total, p) => total + p.valor, 0);
  const filtrados = projetosValidos.filter((p) =>
    (p.titulo + " " + p.status).toLowerCase().includes(busca.toLowerCase()),
  );
  const fluxo = useMemo(
    () => ({
      receitas: lancamentos
        .filter((l) => l.tipo === "receita")
        .reduce((total, l) => total + Number(l.valor || 0), 0),
      despesas: lancamentos
        .filter((l) => l.tipo !== "receita")
        .reduce((total, l) => total + Number(l.valor || 0), 0),
    }),
    [lancamentos],
  );
  const maiorFluxo = Math.max(fluxo.receitas, fluxo.despesas, 1);

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Financeiro da empresa
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão financeira da sua operação — independente do financeiro do
            GESTIO.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          disabled={carregando}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`}
          />{" "}
          Atualizar
        </button>
      </header>

      <form
        className="grid gap-3 rounded-xl border p-4 sm:grid-cols-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (salvando) return;
          setMensagem("");
          const valorNormalizado = valor.trim().replace(",", ".");
          const valorNumero = Number(valorNormalizado);
          if (
            !Number.isFinite(valorNumero) ||
            valorNumero <= 0 ||
            !/^\\d+(?:[.,]\\d{1,2})?$/.test(valor.trim()) ||
            !descricao.trim() ||
            !vencimento
          ) {
            setMensagem(
              "Preencha descrição, valor positivo com até duas casas decimais e vencimento.",
            );
            return;
          }
          setSalvando(true);
          const { error } = await supabase.rpc("financeiro_criar_lancamento", {
            p_tipo: tipo,
            p_descricao: descricao,
            p_valor: valorNumero,
            p_vencimento: vencimento,
            p_projeto_id: null,
          });
          setSalvando(false);
          if (error) {
            setMensagem(error.message);
            return;
          }
          setDescricao("");
          setValor("");
          await carregar();
          setMensagem("Lançamento registrado.");
        }}
      >
        <h2 className="font-bold sm:col-span-5">Contas a pagar e receber</h2>
        <select
          aria-label="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded border p-2"
        >
          <option value="despesa">A pagar</option>
          <option value="receita">A receber</option>
        </select>
        <input
          aria-label="Descrição"
          required
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="rounded border p-2"
        />
        <input
          aria-label="Valor"
          required
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="rounded border p-2"
        />
        <input
          aria-label="Vencimento"
          required
          type="date"
          value={vencimento}
          onChange={(e) => setVencimento(e.target.value)}
          className="rounded border p-2"
        />
        <button
          disabled={salvando}
          className="rounded bg-slate-900 p-2 text-white disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Cadastrar"}
        </button>
      </form>
      {mensagem && (
        <p role="status" className="text-sm">
          {mensagem}
        </p>
      )}
      <section className="rounded-xl border p-4">
        <h2 className="mb-3 font-bold">Lançamentos financeiros</h2>
        {!lancamentosDisponiveis ? (
          <p className="text-sm text-slate-500">
            Não foi possível consultar os lançamentos agora.
          </p>
        ) : lancamentos.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum lançamento cadastrado.
          </p>
        ) : (
          <div className="space-y-2">
            {lancamentos.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm"
              >
                <span>
                  {l.tipo === "receita" ? "Receber" : "Pagar"} — {l.descricao} —{" "}
                  {moeda(Number(l.valor))} — {l.status}
                </span>
                {l.status !== "quitado" && l.status !== "cancelado" && (
                  <button
                    className="rounded border px-3 py-1"
                    onClick={async () => {
                      const quantia = window.prompt("Valor da baixa (R$)");
                      if (quantia === null) return;
                      const valorBaixa = Number(
                        quantia.trim().replace(",", "."),
                      );
                      if (
                        !Number.isFinite(valorBaixa) ||
                        valorBaixa <= 0 ||
                        Math.round(valorBaixa * 100) !== valorBaixa * 100
                      ) {
                        setMensagem(
                          "Informe um valor positivo com até duas casas decimais.",
                        );
                        return;
                      }
                      const agora = new Date();
                      const data = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
                      const { error } = await supabase.rpc(
                        "financeiro_registrar_baixa",
                        {
                          p_lancamento_id: l.id,
                          p_valor: valorBaixa,
                          p_data_pagamento: data,
                          p_metodo: null,
                          p_referencia: null,
                        },
                      );
                      if (error) {
                        setMensagem(error.message);
                        return;
                      }
                      await carregar();
                      setMensagem("Baixa registrada.");
                    }}
                  >
                    Registrar baixa
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      {erro && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <CircleAlert className="h-5 w-5 shrink-0" />
          {erro}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Orçamentos cadastrados",
            value: carregando || erro ? "—" : moeda(valorOrcado),
            detail: "Soma dos valores orçados; não é receita",
            icon: FileText,
          },
          {
            label: "Projetos com orçamento",
            value:
              carregando || erro
                ? "—"
                : String(projetosValidos.filter((p) => p.valor > 0).length),
            detail: "Projetos com valor informado",
            icon: TrendingUp,
          },
          {
            label: "Receitas recebidas",
            value: receitas === null ? "Não disponível" : moeda(receitas),
            detail:
              receitas === null
                ? "Conciliação ainda não habilitada"
                : "Baixas financeiras registradas",
            icon: ArrowDownRight,
          },
          {
            label: "Despesas pagas",
            value: despesas === null ? "Não disponível" : moeda(despesas),
            detail:
              despesas === null
                ? "Conciliação ainda não habilitada"
                : "Baixas financeiras registradas",
            icon: ArrowUpRight,
          },
        ].map((card) => (
          <section
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-500">
                {card.label}
              </p>
              <card.icon className="h-5 w-5 text-violet-600" />
            </div>
            <p className="mt-4 text-xl font-extrabold text-slate-950">
              {card.value}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {card.detail}
            </p>
          </section>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Fluxo financeiro
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Lançamentos cadastrados, antes das baixas
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-violet-600" />
          </div>
          <div className="space-y-4" aria-label="Gráfico de fluxo financeiro">
            {(
              [
                [
                  "Receitas",
                  fluxo.receitas,
                  "bg-emerald-500",
                  "text-emerald-700",
                ],
                ["Despesas", fluxo.despesas, "bg-rose-500", "text-rose-700"],
              ] as const
            ).map(([label, value, color, textColor]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm font-semibold">
                  <span>{label}</span>
                  <span className={textColor}>{moeda(value)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{
                      width: `${Math.max((value / maiorFluxo) * 100, value ? 8 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Saldo previsto
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {moeda(fluxo.receitas - fluxo.despesas)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Cálculo informativo dos lançamentos. O saldo confirmado depende das
            baixas financeiras registradas.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Valores previstos por projeto
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Informações de projetos já cadastrados; valores não recebidos
            </p>
          </div>
          <input
            aria-label="Pesquisar projeto"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar projeto..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-56"
          />
        </div>
        {carregando ? (
          <p className="p-6 text-sm text-slate-500">
            Carregando dados reais...
          </p>
        ) : erro ? (
          <p className="p-6 text-sm text-red-700">
            Não foi possível consultar os projetos.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            Nenhum projeto encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Projeto</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Valor orçado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 font-semibold text-slate-800">
                      {p.titulo}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{p.status}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
                      {moeda(p.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}


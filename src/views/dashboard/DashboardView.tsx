import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Users,
  FileText,
  Clock,
  Sofa,
  Wrench,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  CircleAlert,
  Boxes,
  UserRoundCheck,
} from "lucide-react";
import { clientesService } from "@/modules/clientes/services/clientes.service";
import { projetosService } from "@/modules/furniture/services/projetos.service";
import { servicosService } from "@/modules/servicos/services/servicos.service";
import { conversasPendentesService } from "@/modules/whatsapp/services/conversasPendentes.service";
import {
  StatusProjeto,
  statusProjetoLabel,
  type ProjetoMovelPlanejado,
} from "@/modules/furniture/types/projeto";
import type { Cliente } from "@/modules/clientes/types/cliente";
import type { Servico } from "@/modules/servicos/types/servico";

type PeriodoFiltro = "10" | "todos";

const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
const statusNome = (status: ProjetoMovelPlanejado["status"]) =>
  statusProjetoLabel[status] || String(status);

export default function DashboardView() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<ProjetoMovelPlanejado[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [conversasPendentes, setConversasPendentes] = useState(0);
  const [fontesDisponiveis, setFontesDisponiveis] = useState({
    clientes: false,
    projetos: false,
    servicos: false,
    conversas: false,
  });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("10");

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    setFontesDisponiveis({
      clientes: false,
      projetos: false,
      servicos: false,
      conversas: false,
    });
    try {
      const [cr, pr, sr, wr] = await Promise.all([
        clientesService.listar(),
        projetosService.listar(),
        servicosService.listar(),
        conversasPendentesService.listar("Pendente"),
      ]);
      const erros: string[] = [];
      if (cr.succeeded && cr.value) {
        setClientes(cr.value);
        setFontesDisponiveis((atual) => ({ ...atual, clientes: true }));
      } else erros.push("Clientes não puderam ser carregados.");
      if (pr.succeeded && pr.value) {
        setProjetos(pr.value.items || []);
        setFontesDisponiveis((atual) => ({ ...atual, projetos: true }));
      } else erros.push("Projetos não puderam ser carregados.");
      if (sr.succeeded && sr.value) {
        setServicos(sr.value);
        setFontesDisponiveis((atual) => ({ ...atual, servicos: true }));
      } else erros.push("Serviços não puderam ser carregados.");
      if (wr.succeeded && wr.value) {
        setConversasPendentes(wr.value.length);
        setFontesDisponiveis((atual) => ({ ...atual, conversas: true }));
      } else erros.push("Conversas pendentes não puderam ser carregadas.");
      if (erros.length) setErro(erros.join(" "));
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível consultar os dados.",
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregarDados();
  }, []);

  const projetosAtivos = useMemo(
    () =>
      projetos.filter(
        (p) =>
          ![
            StatusProjeto.Entregue,
            StatusProjeto.InstalacaoConcluida,
            StatusProjeto.Cancelado,
          ].includes(p.status),
      ),
    [projetos],
  );
  const servicosAtivos = useMemo(
    () =>
      servicos.filter(
        (s) =>
          !["Concluido", "Concluído", "Cancelado", "Cancelada"].includes(
            String(s.status),
          ),
      ),
    [servicos],
  );
  const totalOrcamentos = projetos.filter(
    (p) => p.status === StatusProjeto.Orcamento,
  ).length;
  const valorOrcado = projetos.reduce(
    (total, p) => total + (Number(p.valorTotalOrcamento) || 0),
    0,
  );
  const dadosGrafico = useMemo(() => {
    const base = periodo === "10" ? projetos.slice(0, 10) : projetos;
    return base.map((p, i) => ({
      label: p.titulo || `Projeto ${i + 1}`,
      curto: String(i + 1).padStart(2, "0"),
      valor: Math.max(0, Number(p.valorTotalOrcamento) || 0),
    }));
  }, [projetos, periodo]);
  const maxValor = Math.max(1, ...dadosGrafico.map((d) => d.valor)) * 1.12;
  const pontos = dadosGrafico.map((d, i) => ({
    ...d,
    x:
      42 +
      (dadosGrafico.length <= 1 ? 560 : (i / (dadosGrafico.length - 1)) * 560),
    y: 18 + 165 - (d.valor / maxValor) * 165,
  }));
  const caminho = pontos
    .map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`)
    .join(" ");
  const area = pontos.length
    ? `${caminho} L ${pontos[pontos.length - 1].x} 183 L ${pontos[0].x} 183 Z`
    : "";
  const statusItens = useMemo(() => {
    const cores = [
      "#08B981",
      "#1684FF",
      "#FF4658",
      "#F9AB00",
      "#7C3AED",
      "#94A3B8",
    ];
    const mapa = new Map<string, number>();
    projetos.forEach((p) => {
      const nome = statusNome(p.status);
      mapa.set(nome, (mapa.get(nome) || 0) + 1);
    });
    return Array.from(mapa.entries())
      .map(([nome, quantidade], i) => ({
        nome,
        quantidade,
        cor: cores[i % cores.length],
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [projetos]);
  const totalStatus = statusItens.reduce((s, i) => s + i.quantidade, 0);
  const circunferencia = 2 * Math.PI * 52;
  let deslocamento = 0;

  const cards = [
    {
      titulo: "Orçamento total",
      valor: fontesDisponiveis.projetos ? moeda(valorOrcado) : "—",
      icone: TrendingUp,
      cor: "violet",
      detalhe: "Soma dos projetos cadastrados",
      href: "/projetos",
    },
    {
      titulo: "Clientes",
      valor: fontesDisponiveis.clientes ? String(clientes.length) : "—",
      icone: Users,
      cor: "blue",
      detalhe: "Clientes cadastrados",
      href: "/clientes",
    },
    {
      titulo: "Orçamentos",
      valor: fontesDisponiveis.projetos ? String(totalOrcamentos) : "—",
      icone: FileText,
      cor: "violet",
      detalhe: "Projetos em fase de orçamento",
      href: "/projetos",
    },
    {
      titulo: "Serviços em andamento",
      valor:
        fontesDisponiveis.servicos && fontesDisponiveis.projetos
          ? String(servicosAtivos.length + projetosAtivos.length)
          : "—",
      icone: Wrench,
      cor: "green",
      detalhe: "Serviços e projetos não concluídos",
      href: "/servicos",
    },
    {
      titulo: "Conversas pendentes",
      valor: fontesDisponiveis.conversas ? String(conversasPendentes) : "—",
      icone: Clock,
      cor: "blue",
      detalhe: "Atendimentos aguardando resposta",
      href: "/whatsapp",
    },
  ];

  return (
    <div className="min-h-full space-y-4 bg-slate-50/70 pb-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Visão geral
          </h1>
          <p className="text-sm text-slate-500">Visão geral da sua empresa</p>
        </div>
        <button
          type="button"
          onClick={() => void carregarDados()}
          disabled={carregando}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-cyan-300 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`}
          />{" "}
          Atualizar dados
        </button>
      </div>
      {erro && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <CircleAlert className="h-5 w-5 shrink-0" />
          <p>{erro} Os gráficos mostram apenas dados carregados com sucesso.</p>
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-[#08142f] px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_78%_40%,rgba(56,189,248,.32),transparent_28%),linear-gradient(135deg,transparent_50%,rgba(99,102,241,.18))]" />
        <div className="relative z-10 max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
            Conheça a experiência GESTIO
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
            Sua operação inteira.
            <br />
            Uma só perspectiva.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
            Visualize setores, acompanhe sua equipe e encontre o que precisa de
            atenção no mapa da sua marcenaria.
          </p>
          <Link
            to="/visao-3d"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Explorar operação 3D <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="pointer-events-none absolute right-4 top-1/2 hidden h-44 w-[45%] -translate-y-1/2 rotate-[-12deg] gap-2 opacity-80 lg:grid lg:grid-cols-3">
          {[
            "Corte",
            "Montagem",
            "Acabamento",
            "Instalação",
            "Estoque",
            "Financeiro",
          ].map((setor, i) => (
            <div
              key={setor}
              className={`rounded-lg border border-white/20 p-3 text-[9px] font-bold uppercase tracking-wide shadow-inner ${i === 4 ? "bg-amber-300/25" : "bg-cyan-200/20"}`}
            >
              {setor}
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-black text-slate-900">
          Essencial, em um relance
        </h2>
        <span className="text-[10px] text-slate-400">
          Dados carregados do GESTIO
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.titulo}
            to={c.href}
            className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {c.titulo}
              </span>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.cor === "violet" ? "bg-violet-100 text-violet-700" : c.cor === "blue" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}
              >
                <c.icone className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
              {carregando ? "—" : c.valor}
            </div>
            <p className="mt-1 text-xs text-slate-500">{c.detalhe}</p>
            <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600">
              Ver detalhes <ArrowUpRight className="h-3.5 w-3.5" />
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link
          to="/visao-3d"
          className="group flex items-center justify-between rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
              Operação
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">
              Abrir Visão 3D
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Mapa de setores e alertas reais.
            </p>
          </div>
          <Boxes className="h-8 w-8 text-cyan-600" />
        </Link>
        <Link
          to="/equipe"
          className="group flex items-center justify-between rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
              Pessoas
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">
              Abrir Equipe
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Status cadastral e presença registrada.
            </p>
          </div>
          <UserRoundCheck className="h-8 w-8 text-violet-600" />
        </Link>
      </div>

      {fontesDisponiveis.conversas && conversasPendentes > 0 && (
        <Link
          to="/whatsapp"
          className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm transition hover:border-amber-300 hover:bg-amber-100"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">
                Há {conversasPendentes} conversa(s) pendente(s)
              </p>
              <p className="text-xs text-amber-800">
                Revise os atendimentos que aguardam resposta.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-slate-900">
                Orçamentos dos projetos
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Valores cadastrados por projeto — não representa receita
                recebida
              </p>
            </div>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            >
              <option value="10">Até 10 projetos</option>
              <option value="todos">Todos os projetos</option>
            </select>
          </div>
          {carregando ? (
            <p className="py-12 text-sm text-slate-500">
              Carregando gráfico...
            </p>
          ) : !pontos.length ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Cadastre projetos para visualizar o gráfico.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <svg
                viewBox="0 0 630 220"
                className="h-60 w-full min-w-[480px]"
                role="img"
                aria-label="Gráfico dos valores de orçamento por projeto"
              >
                <defs>
                  <linearGradient
                    id="gestioAreaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity=".3" />
                    <stop offset="100%" stopColor="#1684FF" stopOpacity=".02" />
                  </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                  <g key={i}>
                    <line
                      x1="42"
                      y1={18 + 165 * (1 - p)}
                      x2="610"
                      y2={18 + 165 * (1 - p)}
                      stroke="#E2E8F0"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="34"
                      y={22 + 165 * (1 - p)}
                      textAnchor="end"
                      fill="#64748B"
                      fontSize="11"
                    >
                      {Math.round((maxValor * p) / 1000)}k
                    </text>
                  </g>
                ))}
                <path d={area} fill="url(#gestioAreaGradient)" />
                <path
                  d={caminho}
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {pontos.map((p) => (
                  <g key={p.curto}>
                    <title>
                      {p.label}: {moeda(p.valor)}
                    </title>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill="#fff"
                      stroke="#2563EB"
                      strokeWidth="2"
                    />
                    <text
                      x={p.x}
                      y="205"
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize="10"
                    >
                      {p.curto}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {dadosGrafico.slice(0, 6).map((d, i) => (
                  <div
                    key={d.curto}
                    className="flex min-w-0 justify-between gap-3 text-xs"
                  >
                    <span className="truncate text-slate-500">
                      {d.curto}. {d.label}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-800">
                      {moeda(d.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-2">
          <div>
            <h2 className="font-extrabold text-slate-900">
              Status dos Orçamentos
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Distribuição dos projetos por status
            </p>
          </div>
          {carregando ? (
            <p className="py-12 text-sm text-slate-500">
              Carregando gráfico...
            </p>
          ) : !totalStatus ? (
            <p className="py-12 text-sm text-slate-500">
              Sem projetos cadastrados.
            </p>
          ) : (
            <>
              <div className="flex flex-col items-center gap-5 py-4 sm:flex-row sm:justify-around">
                <div className="relative h-44 w-44 shrink-0">
                  <svg
                    viewBox="0 0 140 140"
                    className="h-full w-full -rotate-90"
                  >
                    {statusItens.map((item) => {
                      const len =
                        (item.quantidade / totalStatus) * circunferencia;
                      const offset = deslocamento;
                      deslocamento += len;
                      return (
                        <circle
                          key={item.nome}
                          cx="70"
                          cy="70"
                          r="52"
                          fill="none"
                          stroke={item.cor}
                          strokeWidth="18"
                          strokeDasharray={`${len} ${circunferencia - len}`}
                          strokeDashoffset={-offset}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-900">
                      {totalStatus}
                    </span>
                    <span className="text-[11px] text-slate-500">Projetos</span>
                  </div>
                </div>
                <div className="w-full space-y-3">
                  {statusItens.map((item) => (
                    <div
                      key={item.nome}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.cor }}
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-600">
                        {item.nome}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {Math.round((item.quantidade / totalStatus) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-extrabold text-slate-900">
                Últimos clientes
              </h2>
              <p className="text-xs text-slate-500">
                Clientes cadastrados no sistema
              </p>
            </div>
            <Link
              to="/clientes"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {carregando ? (
            <p className="p-5 text-sm text-slate-500">Carregando clientes...</p>
          ) : clientes.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              Nenhum cliente cadastrado.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {clientes.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                    {(c.nome || "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {c.nome}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {c.telefoneWhatsApp || c.email || "Contato não informado"}
                    </p>
                  </div>
                  <span className="hidden text-xs text-slate-400 sm:block">
                    {c.createdAtUtc
                      ? new Date(c.createdAtUtc).toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-extrabold text-slate-900">
                Serviços em andamento
              </h2>
              <p className="text-xs text-slate-500">
                Projetos e serviços ativos
              </p>
            </div>
            <Link
              to="/servicos"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {carregando ? (
            <p className="p-5 text-sm text-slate-500">Carregando serviços...</p>
          ) : projetosAtivos.length === 0 && servicosAtivos.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              Nenhum serviço em andamento.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {projetosAtivos.slice(0, 5).map((p) => {
                const cliente = clientes.find((c) => c.id === p.clienteId);
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Sofa className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {p.titulo || "Projeto sem título"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {cliente?.nome || "Cliente não vinculado"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-800">
                        {moeda(Number(p.valorTotalOrcamento) || 0)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {statusNome(p.status)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

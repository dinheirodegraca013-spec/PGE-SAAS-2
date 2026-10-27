import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleCheck,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { projetosService } from "@/modules/furniture/services/projetos.service";
import ThreeOperationalMap from "./ThreeOperationalMap";
import {
  StatusProjeto,
  type ProjetoMovelPlanejado,
} from "@/modules/furniture/types/projeto";

type EstoqueItem = {
  id: string;
  nome: string;
  saldo: number;
  estoque_minimo: number;
  unidade: string;
};
type Setor = {
  id: string;
  nome: string;
  detalhe: string;
  estado: "normal" | "atencao" | "critico" | "sem-dados";
  cor: string;
};

const statusClasses: Record<Setor["estado"], string> = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-800",
  atencao: "border-amber-200 bg-amber-50 text-amber-800",
  critico: "border-rose-200 bg-rose-50 text-rose-800",
  "sem-dados": "border-slate-200 bg-slate-50 text-slate-600",
};
const setorCores = [
  "bg-[#c98a4b]",
  "bg-[#6f9bd1]",
  "bg-[#a77bd1]",
  "bg-[#5fb58a]",
  "bg-[#d1b24f]",
  "bg-[#7a8794]",
];

export default function Visao3DView() {
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [projetos, setProjetos] = useState<ProjetoMovelPlanejado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [estoque, projetosResult] = await Promise.all([
        supabase
          .from("estoque_itens")
          .select("id,nome,saldo,estoque_minimo,unidade")
          .order("nome"),
        projetosService.listar(),
      ]);
      const mensagens: string[] = [];
      if (estoque.error) mensagens.push("Estoque indisponível no momento.");
      else setItens((estoque.data || []) as EstoqueItem[]);
      if (!projetosResult.succeeded || !projetosResult.value)
        mensagens.push("Projetos indisponíveis no momento.");
      else setProjetos(projetosResult.value.items || []);
      if (mensagens.length) setErro(mensagens.join(" "));
    } catch {
      setErro("Não foi possível carregar a Visão 3D agora. Tente atualizar.");
    }
    setCarregando(false);
  };

  useEffect(() => {
    void carregar();
  }, []);

  const ativos = projetos.filter(
    (p) =>
      ![StatusProjeto.Entregue, StatusProjeto.Cancelado].includes(p.status),
  );
  const estoqueCritico = itens.filter(
    (item) => Number(item.saldo) <= Number(item.estoque_minimo),
  );
  const setores = useMemo<Setor[]>(
    () => [
      {
        id: "corte",
        nome: "Corte",
        detalhe: ativos.length
          ? `${ativos.length} projeto(s) em andamento`
          : "Sem projetos registrados",
        estado: ativos.length ? "normal" : "sem-dados",
        cor: setorCores[0],
      },
      {
        id: "montagem",
        nome: "Montagem",
        detalhe: ativos.length
          ? "Acompanhe pelas ordens de projeto"
          : "Sem dados operacionais",
        estado: ativos.length ? "normal" : "sem-dados",
        cor: setorCores[1],
      },
      {
        id: "acabamento",
        nome: "Acabamento",
        detalhe: ativos.length
          ? "Acompanhe pelas ordens de projeto"
          : "Sem dados operacionais",
        estado: ativos.length ? "normal" : "sem-dados",
        cor: setorCores[2],
      },
      {
        id: "instalacao",
        nome: "Instalação",
        detalhe: ativos.length
          ? "Acompanhe pelas ordens de projeto"
          : "Sem dados operacionais",
        estado: ativos.length ? "normal" : "sem-dados",
        cor: setorCores[3],
      },
      {
        id: "estoque",
        nome: "Estoque",
        detalhe: itens.length
          ? `${estoqueCritico.length} item(ns) no limite`
          : "Nenhum item cadastrado",
        estado: !itens.length
          ? "sem-dados"
          : estoqueCritico.length
            ? "critico"
            : "normal",
        cor: setorCores[4],
      },
      {
        id: "financeiro",
        nome: "Escritório e financeiro",
        detalhe: "Consulte o módulo financeiro",
        estado: "sem-dados",
        cor: setorCores[5],
      },
    ],
    [ativos.length, estoqueCritico.length, itens.length],
  );

  return (
    <div className="space-y-5 pb-5">
      <header className="gestio-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-cyan-600" />
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Visão 3D
            </h1>
          </div>
          <p className="gestio-section-subtitle">
            Mapa operacional da empresa, inspirado no protótipo ERP 3D.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          disabled={carregando}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
      </header>
      {erro && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {erro}
        </div>
      )}
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative isolate min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative z-10 mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Planta operacional
              </h2>
              <p className="text-sm text-slate-500">
                Clique em um setor para abrir o módulo correspondente.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              Dados do GESTIO
            </span>
          </div>
          <div className="relative z-10">
            <ThreeOperationalMap setores={setores} />
          </div>
          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {setores.map((setor) => (
              <Link key={setor.id} to={setor.id === "estoque" ? "/estoque" : setor.id === "financeiro" ? "/meu-financeiro" : "/projetos"} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${statusClasses[setor.estado]}`}>
                {setor.nome} · {setor.estado === "sem-dados" ? "Sem dados" : setor.estado}
              </Link>
            ))}
          </div>
          <p className="relative z-10 mt-4 text-xs text-slate-500">
            Mapa sem lançamentos fictícios: setores sem fonte transacional
            permanecem em “Sem dados”.
          </p>
        </div>
        <aside className="space-y-4">
          <div
            className={`rounded-2xl border-2 p-4 ${estoqueCritico.length ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
          >
            <div className="flex items-center gap-2 font-bold">
              {estoqueCritico.length ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <CircleCheck className="h-5 w-5" />
              )}
              {estoqueCritico.length ? "Atenção operacional" : "Tudo certo"}
            </div>
            <p className="mt-1 text-sm">
              {estoqueCritico.length
                ? "Há itens que precisam de acompanhamento."
                : "Nenhum alerta crítico foi encontrado nos dados disponíveis."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <small className="text-xs text-slate-500">Projetos ativos</small>
              <b className="mt-1 block text-xl text-slate-900">
                {ativos.length}
              </b>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <small className="text-xs text-slate-500">Itens críticos</small>
              <b className="mt-1 block text-xl text-rose-600">
                {estoqueCritico.length}
              </b>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <small className="text-xs text-slate-500">Setores</small>
              <b className="mt-1 block text-xl text-slate-900">
                {setores.length}
              </b>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="gestio-section-title">O que fazer agora</h2>
            <div className="mt-4 space-y-3">
              {estoqueCritico.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900"
                >
                  <b>Estoque no limite: {item.nome}</b>
                  <p className="mt-1">
                    Saldo {item.saldo} {item.unidade}; mínimo{" "}
                    {item.estoque_minimo}.
                  </p>
                </div>
              ))}
              {!estoqueCritico.length && (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <CircleCheck className="h-4 w-4" />
                  Nenhum alerta de estoque.
                </p>
              )}
              <Link
                to="/estoque"
                className="inline-flex items-center gap-1 text-sm font-bold text-cyan-700"
              >
                Abrir estoque <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="gestio-section-title">Acesso rápido</h2>
            <div className="mt-3 grid gap-2">
              <Link
                to="/projetos"
                className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 hover:bg-cyan-50"
              >
                Projetos e orçamentos
              </Link>
              <Link
                to="/equipe"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 hover:bg-cyan-50"
              >
                <UsersRound className="h-4 w-4" />
                Equipe e presença
              </Link>
            </div>
          </div>
        </aside>
      </section>
      {!carregando && (
        <p className="text-xs text-slate-500">
          O mapa usa projetos e estoque carregados do GESTIO. Setores sem fonte
          de dados exibem “Sem dados”.
        </p>
      )}
    </div>
  );
}


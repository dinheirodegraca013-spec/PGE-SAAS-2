import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { GestioLogo } from "@/components/brand/GestioBrand";
import { planos } from "@/views/auth/planos";

const features = [
  {
    icon: Users,
    title: "Clientes organizados",
    text: "Centralize os dados e o histórico dos seus clientes sem depender de anotações soltas.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Projetos e serviços",
    text: "Acompanhe cada trabalho, do primeiro contato à entrega, com mais clareza.",
  },
  {
    icon: ClipboardList,
    title: "Orçamentos sob controle",
    text: "Organize propostas e acompanhe as oportunidades comerciais em um só lugar.",
  },
  {
    icon: MessageCircle,
    title: "Conversas conectadas",
    text: "Tenha mais contexto para acompanhar os contatos e as conversas com clientes.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      <header className="relative z-10 border-b border-white/10 bg-[#080D1B] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" aria-label="Gestio - página inicial">
            <GestioLogo variant="dark" size="md" withTagline={false} />
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6">
            <a
              href="#recursos"
              className="hidden text-sm text-slate-300 transition hover:text-white sm:inline"
            >
              Recursos
            </a>
            <a
              href="#planos"
              className="hidden text-sm text-slate-300 transition hover:text-white sm:inline"
            >
              Planos
            </a>
            <a
              href="#para-quem"
              className="hidden text-sm text-slate-300 transition hover:text-white sm:inline"
            >
              Para quem é
            </a>
            <Link
              to="/login"
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold transition hover:border-cyan-300/70 hover:bg-white/5"
            >
              Acessar sistema
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate bg-[#080D1B] text-white">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 72% 20%, rgba(6,182,212,.20), transparent 34%), radial-gradient(ellipse at 18% 90%, rgba(124,58,237,.22), transparent 36%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3.5 py-2 text-xs font-semibold tracking-wide text-cyan-200 sm:text-sm">
              <Sparkles className="h-4 w-4" /> Gestão simples. Trabalho bem
              organizado.
            </div>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Sua empresa merece uma gestão que{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 bg-clip-text text-transparent">
                acompanha seu ritmo.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Clientes, projetos, serviços, orçamentos e conversas em um só
              lugar. Menos informação perdida, mais visão do que está
              acontecendo no seu negócio.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/cadastro"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Conhecer os planos <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Já tenho uma conta
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-300" /> Acesso online
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-300" /> Fluxo simples
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-300" /> Feito para
                sua rotina
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-400/20 to-violet-500/20 blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-[#111A2C]/95 p-4 shadow-2xl shadow-black/30 sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs text-slate-400">VISÃO GERAL</p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Resumo da operação
                  </h2>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 p-2.5 text-slate-950">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: "Clientes", value: "Relacionamentos", icon: Users },
                  {
                    label: "Projetos",
                    value: "Trabalhos ativos",
                    icon: Wrench,
                  },
                  {
                    label: "Orçamentos",
                    value: "Oportunidades",
                    icon: ClipboardList,
                  },
                  {
                    label: "Serviços",
                    value: "Rotina organizada",
                    icon: Boxes,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-white/[.035] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">
                          {item.label}
                        </span>
                        <Icon className="h-4 w-4 text-cyan-300" />
                      </div>
                      <p className="mt-4 text-base font-semibold text-white">
                        {item.value}
                      </p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.06] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-300/10 p-2.5 text-cyan-200">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      Mais clareza para decidir
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Informações importantes reunidas para você acompanhar a
                      operação.
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-[11px] text-slate-500">
                Ilustração demonstrativa da experiência Gestio
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="recursos"
        className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-700">
            Tudo mais conectado
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Organize o trabalho. Ganhe visão do negócio.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Uma rotina mais clara começa quando as informações deixam de ficar
            espalhadas.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg hover:shadow-slate-200/60"
            >
              <div className="inline-flex rounded-xl bg-gradient-to-br from-cyan-50 to-violet-50 p-3 text-cyan-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="planos"
        className="border-y border-slate-200 bg-white px-5 py-16 sm:px-8 sm:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-violet-700">
              Planos transparentes
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Escolha o tamanho certo para sua operação.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Os mesmos planos e valores usados no cadastro do Gestio, sem
              informações demonstrativas.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {planos.map((plano) => (
              <article
                key={plano.valor}
                className={`relative rounded-2xl border p-6 shadow-sm ${plano.destaque ? "border-cyan-400 bg-cyan-50/40 shadow-cyan-100" : "border-slate-200 bg-white"}`}
              >
                {plano.destaque && (
                  <span className="absolute -top-3 left-6 rounded-full bg-cyan-600 px-3 py-1 text-[11px] font-bold text-white">
                    Mais escolhido
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-900">
                  {plano.nome}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {plano.descricao}
                </p>
                <p className="mt-5 text-2xl font-bold text-slate-950">
                  {plano.precoMensal}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-700">
                  {plano.recursos.map((recurso) => (
                    <li key={recurso} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                      {recurso}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Ver disponibilidade e cadastrar <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="para-quem" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-violet-700">
              Feito para quem faz
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Mais organização para quem entrega trabalho de verdade.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-600">
              A Gestio ajuda pequenas empresas a manter clientes, serviços e
              projetos organizados, com uma experiência pensada para acompanhar
              a rotina do negócio.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Marcenarias",
              "Serralherias",
              "Prestadores de serviços",
              "Pequenas empresas",
            ].map((label) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="font-semibold text-slate-800">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 rounded-3xl bg-[#080D1B] p-7 text-white sm:p-10 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-cyan-300">
              GESTIO · Gestão inteligente para quem faz acontecer
            </p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
              Pronto para organizar sua próxima etapa?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Acesse sua conta ou conheça as opções disponíveis para sua
              empresa.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              to="/cadastro"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-bold text-slate-950"
            >
              Ver planos <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white/5"
            >
              Acessar
            </Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-slate-200 px-5 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Gestio. Gestão inteligente para quem faz
        acontecer.
      </footer>
    </main>
  );
}


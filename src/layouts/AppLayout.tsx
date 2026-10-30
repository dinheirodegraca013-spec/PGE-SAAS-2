import React, { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  Search,
  Crown,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { navGroups } from "./navigation";

function getPapelVisivel(papel?: string | null) {
  const normalizado = String(papel || "")
    .trim()
    .toLowerCase()
    .replace(/[ _-]/g, "");
  const nomes: Record<string, string> = {
    administradortenant: "Administrador da empresa",
    tenantadmin: "Administrador da empresa",
    administrador: "Administrador da empresa",
    superadmin: "Superadministrador",
    saasadmin: "Superadministrador",
    financeiro: "Financeiro",
    gestor: "Gestor",
    usuario: "Usuário",
  };
  return (
    nomes[normalizado] ||
    (papel && !/tenant/i.test(papel) ? papel : "Administrador da empresa")
  );
}

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const auth = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    auth.logout();
    navigate("/login");
  };

  let currentTitle = "Início";
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.path === location.pathname) currentTitle = item.label;
    }
  }
  if (location.pathname.startsWith("/servicos/"))
    currentTitle = "Detalhe do Serviço";
  if (location.pathname.startsWith("/projetos/"))
    currentTitle = "Detalhe do Projeto";
  if (location.pathname === "/whatsapp") currentTitle = "Conversas WhatsApp";
  if (location.pathname === "/whatsapp/configuracao")
    currentTitle = "Configuração do WhatsApp";
  if (location.pathname === "/configuracoes") currentTitle = "Configurações";

  return (
    <div className="gestio-app flex h-screen overflow-hidden">
      {mobileMenuOpen && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`gestio-sidebar fixed inset-y-0 left-0 z-50 flex w-[254px] shrink-0 flex-col transition-transform duration-300 md:static md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="gestio-brand flex h-[102px] shrink-0 items-center gap-3 border-b border-white/10 px-7">
          <img
            src="/gestio-mark.png"
            alt="Emblema GESTIO"
            className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,.28)]"
          />
          <div className="min-w-0 leading-none">
            <span className="block text-[25px] font-black tracking-[-0.045em] text-white">
              GESTIO
            </span>
            <span className="mt-2 block text-[9px] font-semibold uppercase tracking-[.18em] text-cyan-300">
              Gestão inteligente
            </span>
          </div>
          <button
            aria-label="Fechar menu"
            type="button"
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="gestio-nav flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== "/" &&
                      location.pathname.startsWith(item.path + "/"));
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`gestio-nav-link flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200 ${isActive ? "gestio-nav-active text-white" : "text-slate-300 hover:bg-white/[.07] hover:text-white"}`}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}
                        />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(103,232,249,.9)]" />
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 pb-4">
          <div className="gestio-plan-card rounded-2xl border border-cyan-400/40 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 text-white shadow-lg shadow-violet-900/40">
                <Crown className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">
                  Plano {auth.usuario?.plano || "Não informado"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Ferramentas para organizar e fazer sua empresa crescer.
                </p>
              </div>
            </div>
            <NavLink
              to="/configuracoes"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110"
            >
              Ver recursos <ArrowRight className="h-4 w-4" />
            </NavLink>
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          <NavLink
            to="/configuracoes"
            className="group mb-2 flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[.06]"
          >
            {auth.usuario?.avatarUrl ? (
              <img
                src={auth.usuario.avatarUrl}
                alt={auth.usuario.nomeCompleto}
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-cyan-400/50"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/50 bg-slate-800 text-xs font-bold text-white">
                {(auth.usuario?.nomeCompleto || "U").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {auth.usuario?.nomeCompleto ?? "Usuário"}
              </p>
              <p className="truncate text-xs text-slate-400">
                {getPapelVisivel(auth.usuario?.papel)}
              </p>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[.06] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="gestio-topbar flex min-h-[77px] shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 px-4 sm:px-6 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menu"
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden w-full max-w-[420px] items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-slate-400 shadow-sm sm:flex">
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs">
                Gestão inteligente para sua empresa
              </span>
            </div>
            <div className="sm:hidden">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
                GESTIO
              </p>
              <p className="text-sm font-bold text-slate-900">{currentTitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            {auth.isSaaSInterno && (
              <NavLink
                to="/admin"
                className="hidden items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:inline-flex"
              >
                <Shield className="h-3.5 w-3.5 text-cyan-300" />
                Painel administrativo
              </NavLink>
            )}
            <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sistema online
            </span>
            <button
              type="button"
              aria-label="Notificações"
              className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-white hover:text-violet-700"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
            </button>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white ring-2 ring-cyan-100">
                {(auth.usuario?.nomeCompleto || "U").slice(0, 2).toUpperCase()}
              </div>
              <div className="max-w-[150px]">
                <p className="truncate text-xs font-bold text-slate-900">
                  {auth.usuario?.nomeCompleto ?? "Usuário"}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {auth.usuario?.papel ?? "Administrador"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="gestio-content flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-6 lg:px-9 lg:pb-8">
          <Outlet />
          <div className="gestio-footer-banner mt-7 flex flex-col gap-4 rounded-2xl border border-cyan-400/30 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-center gap-3">
              <img
                src="/gestio-mark.png"
                alt=""
                className="h-12 w-12 object-contain"
              />
              <div>
                <p className="text-lg font-black tracking-tight text-white">
                  GESTIO
                </p>
                <p className="text-xs text-slate-300">
                  Gestão inteligente para quem faz acontecer.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-200">
              <span>Mais controle</span>
              <span className="text-cyan-300">✦</span>
              <span>Mais produtividade</span>
              <span className="text-violet-300">✦</span>
              <span>Mais resultados</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


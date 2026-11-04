import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  PackageCheck,
  CalendarClock,
  ShieldCheck,
  DollarSign,
  Receipt,
  CreditCard,
  Link as LinkIcon,
  FileSpreadsheet,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  Shield,
  Layers,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { GestioEmblem } from "@/components/brand/GestioBrand";

interface AdminNavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  superAdminOnly?: boolean;
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const auth = useAuthStore();
  const navigate = useNavigate();

  const adminNavItems: AdminNavItem[] = [
    { label: "Visão Geral", path: "/admin", icon: LayoutDashboard, end: true },
    { label: "Empresas Clientes", path: "/admin/empresas", icon: Building2 },
    { label: "Planos do SaaS", path: "/admin/planos", icon: PackageCheck },
    { label: "Assinaturas", path: "/admin/assinaturas", icon: CalendarClock },
    {
      label: "Equipe & Acessos",
      path: "/admin/usuarios",
      icon: ShieldCheck,
      superAdminOnly: true,
    },
  ];

  const financeiroNavItems: AdminNavItem[] = [
    {
      label: "Resumo Financeiro",
      path: "/financeiro",
      icon: DollarSign,
      end: true,
    },
    {
      label: "Faturas & Cobranças",
      path: "/financeiro/cobrancas",
      icon: Receipt,
    },
    {
      label: "Pagamentos & Conciliação",
      path: "/financeiro/pagamentos",
      icon: CreditCard,
    },
    { label: "Links de Pagamento", path: "/financeiro/links", icon: LinkIcon },
    {
      label: "Relatórios & Exportação",
      path: "/financeiro/relatorios",
      icon: FileSpreadsheet,
    },
  ];

  const handleLogout = async () => {
    await auth.logout();
    navigate("/login");
  };

  return (
    <div className="gestio-app flex h-screen overflow-hidden font-sans text-slate-800 antialiased">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`gestio-sidebar fixed inset-y-0 left-0 z-50 flex w-[254px] shrink-0 flex-col text-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-0 sm:-translate-x-full lg:translate-x-0"
        } ${!sidebarOpen && "max-lg:-translate-x-full"}`}
      >
        {/* Brand Header */}
        <div className="gestio-brand flex h-[102px] items-center justify-between border-b border-white/10 px-7">
          <div className="flex items-center gap-3">
            <GestioEmblem size={46} />
            <div className="leading-none">
              <span className="block text-[25px] font-black tracking-[-0.045em] text-white">
                GESTIO
              </span>
              <span className="mt-2 block text-[9px] font-semibold uppercase tracking-[.18em] text-cyan-300">
                Gestão inteligente
              </span>
            </div>
          </div>
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:text-white lg:hidden cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {/* Seção Administração: exclusiva do Super Admin */}
          {auth.isSuperAdmin && (
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">
                Administração do SaaS
              </span>
              <nav className="mt-2 space-y-1">
                {adminNavItems
                  .filter((item) => !item.superAdminOnly || auth.isSuperAdmin)
                  .map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200 ${
                          isActive
                            ? "gestio-nav-active text-white"
                            : "text-slate-300 hover:bg-white/[.07] hover:text-white"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
              </nav>
            </div>
          )}

          {/* Seção Financeiro */}
          {auth.isSaaSFinanceiro && (
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">
                Gestão Financeira
              </span>
              <nav className="mt-2 space-y-1">
                {financeiroNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? "gestio-nav-active text-white"
                          : "text-slate-300 hover:bg-white/[.07] hover:text-white"
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          )}

          {/* Atalho para o Painel do Cliente */}
          <div className="border-t border-white/10 pt-2">
            <span className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">
              Alternar Ambiente
            </span>
            <div className="mt-2">
              <NavLink
                to="/"
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-slate-300 transition hover:bg-white/[.07] hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 text-brand-400" />
                <span>Painel da Empresa (Cliente)</span>
              </NavLink>
            </div>
          </div>
        </div>

        {/* Footer com Usuário e Logout */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/50 bg-slate-800 text-xs font-bold text-white">
                {auth.usuario?.nomeCompleto?.charAt(0) || "A"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {auth.usuario?.nomeCompleto}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {auth.usuario?.papelInterno || auth.usuario?.papel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[.06] hover:text-red-400 cursor-pointer"
              title="Sair do sistema"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="gestio-topbar flex min-h-[77px] shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 px-4 sm:px-6 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                <Layers className="h-3.5 w-3.5 text-brand-600" />
                Ambiente Interno
              </span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="hidden sm:inline text-slate-600">
                {auth.isSuperAdmin
                  ? "Acesso Global Super Admin"
                  : "Acesso Operador Autorizado"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Sistema online
            </span>
            <NavLink
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              Painel do Cliente
            </NavLink>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white ring-2 ring-cyan-100">
                {(auth.usuario?.nomeCompleto || "A").slice(0, 2).toUpperCase()}
              </div>
              <div className="max-w-[150px]">
                <p className="truncate text-xs font-bold text-slate-900">
                  {auth.usuario?.nomeCompleto || "Administrador"}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {auth.usuario?.papelInterno ||
                    auth.usuario?.papel ||
                    "Acesso interno"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="gestio-content flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-6 lg:px-9 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


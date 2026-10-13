import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

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
    { label: 'Visão Geral', path: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Empresas Clientes', path: '/admin/empresas', icon: Building2 },
    { label: 'Planos do SaaS', path: '/admin/planos', icon: PackageCheck },
    { label: 'Assinaturas', path: '/admin/assinaturas', icon: CalendarClock },
    { label: 'Equipe & Acessos', path: '/admin/usuarios', icon: ShieldCheck, superAdminOnly: true },
  ];

  const financeiroNavItems: AdminNavItem[] = [
    { label: 'Resumo Financeiro', path: '/financeiro', icon: DollarSign, end: true },
    { label: 'Faturas & Cobranças', path: '/financeiro/cobrancas', icon: Receipt },
    { label: 'Pagamentos & Conciliação', path: '/financeiro/pagamentos', icon: CreditCard },
    { label: 'Links de Pagamento', path: '/financeiro/links', icon: LinkIcon },
    { label: 'Relatórios & Exportação', path: '/financeiro/relatorios', icon: FileSpreadsheet },
  ];

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-slate-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-0 sm:-translate-x-full lg:translate-x-0'
        } ${!sidebarOpen && 'max-lg:-translate-x-full'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-bold text-base shadow-sm">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-sm font-bold tracking-tight text-white">PGE SAAS 2</span>
              <span className="block text-[11px] font-medium text-slate-400">{auth.isSuperAdmin ? 'Administração Global' : 'Gestão Financeira'}</span>
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
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {/* Seção Administração: exclusiva do Super Admin */}
          {auth.isSuperAdmin && (
          <div>
            <span className="px-3 text-[11px] font-bold tracking-wider uppercase text-slate-500">
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
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
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
              <span className="px-3 text-[11px] font-bold tracking-wider uppercase text-slate-500">
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
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
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
          <div className="pt-2 border-t border-slate-800/80">
            <span className="px-3 text-[11px] font-bold tracking-wider uppercase text-slate-500">
              Alternar Ambiente
            </span>
            <div className="mt-2">
              <NavLink
                to="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-brand-400" />
                <span>Painel da Empresa (Cliente)</span>
              </NavLink>
            </div>
          </div>
        </div>

        {/* Footer com Usuário e Logout */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white border border-slate-700">
                {auth.usuario?.nomeCompleto?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{auth.usuario?.nomeCompleto}</p>
                <p className="truncate text-[11px] text-brand-400 font-mono">
                  {auth.usuario?.papelInterno || auth.usuario?.papel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition cursor-pointer"
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
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
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
                {auth.isSuperAdmin ? 'Acesso Global Super Admin' : 'Acesso Operador Autorizado'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              Painel do Cliente
            </NavLink>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

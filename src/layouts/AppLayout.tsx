import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { navGroups } from './navigation';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const auth = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  // Find current title
  let currentTitle = 'Início';
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.path === location.pathname) {
        currentTitle = item.label;
        break;
      }
    }
  }
  if (location.pathname.startsWith('/servicos/')) currentTitle = 'Detalhe do Serviço';
  if (location.pathname.startsWith('/projetos/')) currentTitle = 'Detalhe do Projeto';
  if (location.pathname === '/whatsapp') currentTitle = 'Conversas WhatsApp';
  if (location.pathname === '/whatsapp/configuracao') currentTitle = 'Configuração do WhatsApp';
  if (location.pathname === '/configuracoes') currentTitle = 'Configurações do Sistema';

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm shadow-xs">
              E
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">ERP SaaS</span>
          </div>
          <button
            type="button"
            className="md:hidden text-slate-500 hover:text-slate-800"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-50 text-brand-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'text-brand-600' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 px-2">
            <div className="flex items-center justify-between mb-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {auth.usuario?.nomeCompleto ?? 'Usuário'}
              </p>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 uppercase tracking-wide">
                {auth.usuario?.plano ?? 'Standard'}
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">{auth.usuario?.email ?? 'usuario@empresa.com.br'}</p>
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 text-slate-500" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden text-slate-600 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-medium text-slate-600">{currentTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            {auth.isSaaSInterno && (
              <NavLink
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                <Shield className="h-3.5 w-3.5 text-brand-400" />
                Painel Administrativo
              </NavLink>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Modo Online
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

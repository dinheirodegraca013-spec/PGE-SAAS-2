/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuthStore } from './stores/auth';
import AppLayout from './layouts/AppLayout';
import AdminLayout from './layouts/AdminLayout';
import AdminGuard from './components/auth/AdminGuard';
import FinanceiroGuard from './components/auth/FinanceiroGuard';

// Views do Painel do Cliente (Existentes - 100% preservadas)
import DashboardView from './views/dashboard/DashboardView';
import LoginView from './views/auth/LoginView';
import RegisterView from './views/auth/RegisterView';
import ClientesListView from './modules/clientes/views/ClientesListView';
import ProjetosListView from './modules/furniture/views/ProjetosListView';
import ProjetoDetalheView from './modules/furniture/views/ProjetoDetalheView';
import ServicosListView from './modules/servicos/views/ServicosListView';
import ServicoDetalheView from './modules/servicos/views/ServicoDetalheView';
import OrcamentoPublicoView from './modules/orcamentos/views/OrcamentoPublicoView';
import ConversasPendentesView from './modules/whatsapp/views/ConversasPendentesView';
import WhatsAppConfiguracaoView from './modules/whatsapp/views/WhatsAppConfiguracaoView';
import WhatsAppInboxView from './modules/whatsapp/views/WhatsAppInboxView';
import SettingsView from './views/settings/SettingsView';
import NotFoundView from './views/NotFoundView';
import PagamentoObrigadoView from './views/pagamento/PagamentoObrigadoView';

// Views dos Novos Painéis do SaaS (Super Admin & Financeiro)
import AdminDashboardView from './views/admin/AdminDashboardView';
import AdminEmpresasView from './views/admin/AdminEmpresasView';
import AdminPlanosView from './views/admin/AdminPlanosView';
import AdminAssinaturasView from './views/admin/AdminAssinaturasView';
import AdminUsuariosView from './views/admin/AdminUsuariosView';
import FinanceiroDashboardView from './views/admin/financeiro/FinanceiroDashboardView';
import FinanceiroCobrancasView from './views/admin/financeiro/FinanceiroCobrancasView';
import FinanceiroPagamentosView from './views/admin/financeiro/FinanceiroPagamentosView';
import FinanceiroLinksView from './views/admin/financeiro/FinanceiroLinksView';
import FinanceiroRelatoriosView from './views/admin/financeiro/FinanceiroRelatoriosView';
import AcessoNegadoView from './views/admin/AcessoNegadoView';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore();
  const location = useLocation();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Verificando sessão segura...</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginView />
              </PublicOnly>
            }
          />
          <Route
            path="/cadastro"
            element={
              <PublicOnly>
                <RegisterView />
              </PublicOnly>
            }
          />

          {/* Página de Acesso Restrito / Negado */}
          <Route path="/acesso-negado" element={<AcessoNegadoView />} />

          {/* Retornos públicos do checkout Mercado Pago; URLs não aparecem na navegação */}
          <Route path="/pagamento/obrigado/:plano" element={<PagamentoObrigadoView />} />
          <Route path="/obrigado-free" element={<PagamentoObrigadoView />} />
          <Route path="/obrigado-standard" element={<PagamentoObrigadoView />} />
          <Route path="/obrigado-empresarial" element={<PagamentoObrigadoView />} />

          {/* Página pública de aprovação de orçamento (aberta pelo cliente final) */}
          <Route path="/orcamento/:id" element={<OrcamentoPublicoView />} />

          {/* =============================================================== */}
          {/* PAINEL DO CLIENTE (EXISTENTE - 100% PRESERVADO) */}
          {/* =============================================================== */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardView />} />
            <Route path="clientes" element={<ClientesListView />} />
            <Route path="servicos" element={<ServicosListView />} />
            <Route path="servicos/:id" element={<ServicoDetalheView />} />
            <Route path="projetos" element={<ProjetosListView />} />
            <Route path="projetos/:id" element={<ProjetoDetalheView />} />
            <Route path="whatsapp" element={<ConversasPendentesView />} />
            <Route path="whatsapp/inbox" element={<WhatsAppInboxView />} />
            <Route path="whatsapp/configuracao" element={<WhatsAppConfiguracaoView />} />
            <Route path="configuracoes" element={<SettingsView />} />
          </Route>

          {/* =============================================================== */}
          {/* DASHBOARD ADMINISTRATIVO & FINANCEIRO DO SAAS */}
          {/* =============================================================== */}
          <Route
            path="/admin"
            element={
              <AdminGuard requireSuperAdmin>
                <AdminLayout />
              </AdminGuard>
            }
          >
            {/* Administração Global (Super Admin / SaaSConsulta) */}
            <Route index element={<AdminDashboardView />} />
            <Route path="empresas" element={<AdminEmpresasView />} />
            <Route path="planos" element={<AdminPlanosView />} />
            <Route path="assinaturas" element={<AdminAssinaturasView />} />
            <Route
              path="usuarios"
              element={
                <AdminGuard requireSuperAdmin>
                  <AdminUsuariosView />
                </AdminGuard>
              }
            />

            {/* Gestão Financeira (Super Admin / SaaSFinanceiro) */}
            <Route
              path="financeiro"
              element={
                <FinanceiroGuard>
                  <FinanceiroDashboardView />
                </FinanceiroGuard>
              }
            />
            <Route
              path="financeiro/cobrancas"
              element={
                <FinanceiroGuard>
                  <FinanceiroCobrancasView />
                </FinanceiroGuard>
              }
            />
            <Route
              path="financeiro/pagamentos"
              element={
                <FinanceiroGuard>
                  <FinanceiroPagamentosView />
                </FinanceiroGuard>
              }
            />
            <Route
              path="financeiro/links"
              element={
                <FinanceiroGuard>
                  <FinanceiroLinksView />
                </FinanceiroGuard>
              }
            />
            <Route
              path="financeiro/relatorios"
              element={
                <FinanceiroGuard>
                  <FinanceiroRelatoriosView />
                </FinanceiroGuard>
              }
            />
          </Route>

          {/* Painel financeiro com rota direta e permissões próprias */}
          <Route
            path="/financeiro"
            element={
              <FinanceiroGuard>
                <AdminLayout />
              </FinanceiroGuard>
            }
          >
            <Route index element={<FinanceiroDashboardView />} />
            <Route path="cobrancas" element={<FinanceiroCobrancasView />} />
            <Route path="pagamentos" element={<FinanceiroPagamentosView />} />
            <Route path="links" element={<FinanceiroLinksView />} />
            <Route path="relatorios" element={<FinanceiroRelatoriosView />} />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuthStore } from './stores/auth';
import AppLayout from './layouts/AppLayout';
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

          {/* Página pública de aprovação de orçamento (aberta pelo cliente final) */}
          <Route path="/orcamento/:id" element={<OrcamentoPublicoView />} />

          {/* Rotas Protegidas do ERP */}
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

          {/* 404 */}
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

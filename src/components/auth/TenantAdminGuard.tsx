import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export default function TenantAdminGuard({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore();
  const location = useLocation();

  if (auth.isLoading) {
    return <div role="status" className="flex min-h-screen items-center justify-center bg-slate-50">Verificando autorização…</div>;
  }
  if (!auth.isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (auth.usuario?.papel !== 'AdministradorTenant' && auth.usuario?.papelInterno !== 'SuperAdmin') {
    return <Navigate to="/acesso-negado" replace />;
  }
  return <>{children}</>;
}

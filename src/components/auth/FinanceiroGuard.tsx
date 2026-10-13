import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export default function FinanceiroGuard({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore();
  const location = useLocation();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Verificando autorização financeira...</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!auth.isSaaSFinanceiro) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <>{children}</>;
}

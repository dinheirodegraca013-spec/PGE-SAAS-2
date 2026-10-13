import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

interface AdminGuardProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export default function AdminGuard({ children, requireSuperAdmin = false }: AdminGuardProps) {
  const auth = useAuthStore();
  const location = useLocation();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Verificando autorização administrativa...</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requireSuperAdmin && !auth.isSuperAdmin) {
    return <Navigate to="/acesso-negado" replace />;
  }

  if (!auth.isSaaSInterno) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <>{children}</>;
}

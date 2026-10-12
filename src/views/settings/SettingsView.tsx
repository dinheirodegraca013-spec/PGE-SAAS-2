import React from 'react';
import { Settings, Shield, User, Database, Building2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

export default function SettingsView() {
  const auth = useAuthStore();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Configurações do Sistema</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie os dados da empresa, plano de assinatura do SaaS e permissões de acesso.
        </p>
      </div>

      <div className="card divide-y divide-slate-100 p-6 space-y-6">
        {/* Perfil e Tenant */}
        <div className="flex items-start gap-4 pt-0">
          <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Dados da Marcenaria / Tenant</h3>
            <p className="text-xs text-slate-500 mt-0.5">Identificador único do locatário (multi-tenant): {auth.usuario?.tenantId}</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400">Usuário Conectado:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{auth.usuario?.nomeCompleto}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-slate-400">E-mail:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{auth.usuario?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plano Atual */}
        <div className="flex items-start gap-4 pt-6">
          <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Plano de Assinatura Ativo</h3>
                <p className="text-xs text-slate-500 mt-0.5">Plano {auth.usuario?.plano ?? 'Standard'} com suporte a clientes ilimitados e WhatsApp API.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                Ativo
              </span>
            </div>
          </div>
        </div>

        {/* Dados e Armazenamento */}
        <div className="flex items-start gap-4 pt-6">
          <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
            <Database className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Integração com Backend C# (.NET)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              URL da API configurada: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'}</code>
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Todas as transações operam com redundância de sincronização local para máxima resiliência.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

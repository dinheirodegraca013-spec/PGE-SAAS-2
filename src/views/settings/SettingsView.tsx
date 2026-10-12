import React from 'react';
import { Settings, Shield, User, Database, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function SettingsView() {
  const auth = useAuthStore();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Configurações do Sistema</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie os dados da empresa, plano de assinatura do SaaS, banco de dados Supabase e permissões de acesso.
        </p>
      </div>

      <div className="card divide-y divide-slate-100 p-6 space-y-6">
        {/* Perfil e Tenant */}
        <div className="flex items-start gap-4 pt-0">
          <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Dados da Organização / Tenant</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identificador único de isolamento (RLS tenant_id / organization_id): <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono font-semibold">{auth.usuario?.tenantId}</code>
            </p>
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

        {/* Status do Supabase */}
        <div className="flex items-start gap-4 pt-6">
          <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
            <Database className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Banco de Dados & Auth (Supabase)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conexão oficial via <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">@supabase/supabase-js</code>
                </p>
              </div>
              {isSupabaseConfigured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Supabase Ativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  Vercel Env Detectada
                </span>
              )}
            </div>

            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
              <p className="text-slate-600">
                • <strong>Variáveis de Ambiente:</strong> <code className="bg-white px-1 py-0.5 rounded border border-slate-200">VITE_SUPABASE_URL</code> e <code className="bg-white px-1 py-0.5 rounded border border-slate-200">VITE_SUPABASE_ANON_KEY</code> lidas em produção.
              </p>
              <p className="text-slate-600">
                • <strong>Políticas de RLS:</strong> Isolamento de dados por <code className="bg-white px-1 py-0.5 rounded border border-slate-200">organization_id</code> ativado nas tabelas <code className="bg-white px-1 py-0.5 rounded border border-slate-200">clientes</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200">projetos</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200">servicos</code> e <code className="bg-white px-1 py-0.5 rounded border border-slate-200">orcamentos</code>.
              </p>
              <p className="text-slate-600">
                • <strong>Esquema SQL:</strong> Disponível no arquivo <code className="bg-white px-1 py-0.5 rounded border border-slate-200">supabase/schema.sql</code> para aplicação direta no Supabase SQL Editor.
              </p>
            </div>
          </div>
        </div>

        {/* Plano Atual */}
        <div className="flex items-start gap-4 pt-6">
          <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Plano de Assinatura Ativo</h3>
                <p className="text-xs text-slate-500 mt-0.5">Plano {auth.usuario?.plano ?? 'Standard'} com suporte a clientes ilimitados e multi-tenant.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                Ativo
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

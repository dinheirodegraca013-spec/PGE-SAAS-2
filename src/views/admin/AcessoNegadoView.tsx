import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

export default function AcessoNegadoView() {
  const auth = useAuthStore();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg border border-slate-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-6 ring-8 ring-red-50/50">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Acesso Restrito</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Esta área é de uso exclusivo da equipe interna de administração e financeira da plataforma PGE SAAS 2.
        </p>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-100 text-left text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Usuário conectado:</span>
            <span className="font-semibold text-slate-800">{auth.usuario?.email || 'Não autenticado'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Papel do usuário:</span>
            <span className="font-semibold text-slate-800">{auth.usuario?.papel || 'Cliente'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Papel interno do SaaS:</span>
            <span className="font-semibold text-amber-700">{auth.usuario?.papelInterno || 'Nenhum'}</span>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Se você precisa de acesso administrativo ou financeiro global, solicite a um <strong>Super Admin</strong> do SaaS.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Painel da Empresa
          </Link>
          <button
            type="button"
            onClick={() => auth.logout()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Trocar de Conta
          </button>
        </div>
      </div>
    </div>
  );
}

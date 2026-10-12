import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 text-center">
      <p className="text-7xl font-extrabold text-slate-200">404</p>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Página não encontrada</h1>
      <p className="mt-1 text-sm text-slate-500">O endereço acessado não existe ou foi movido.</p>
      <Link to="/" className="btn-primary mt-6">
        Voltar para o início
      </Link>
    </div>
  );
}

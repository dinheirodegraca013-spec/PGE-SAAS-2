import React from 'react';
import { StatusProjeto, statusProjetoLabel } from '../types/projeto';

interface StatusProjetoBadgeProps {
  status: StatusProjeto;
}

export default function StatusProjetoBadge({ status }: StatusProjetoBadgeProps) {
  const getColorClasses = () => {
    switch (status) {
      case StatusProjeto.Cancelado:
        return 'bg-red-50 text-red-700 ring-red-600/20';
      case StatusProjeto.Entregue:
      case StatusProjeto.InstalacaoConcluida:
        return 'bg-green-50 text-green-700 ring-green-600/20';
      case StatusProjeto.EmProducao:
      case StatusProjeto.PronoParaEntrega:
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case StatusProjeto.Aprovado:
        return 'bg-brand-50 text-brand-700 ring-brand-600/20';
      default:
        return 'bg-slate-100 text-slate-600 ring-slate-500/20';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getColorClasses()}`}
    >
      {statusProjetoLabel[status] ?? 'Desconhecido'}
    </span>
  );
}

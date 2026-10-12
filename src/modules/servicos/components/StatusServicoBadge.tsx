import React from 'react';
import { statusServicoLabel } from '../types/servico';

interface StatusServicoBadgeProps {
  status: string;
}

export default function StatusServicoBadge({ status }: StatusServicoBadgeProps) {
  const getColorClasses = () => {
    switch (status) {
      case 'EmAndamento':
        return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      case 'EscopoDefinido':
      case 'OrcamentoEnviado':
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'Aprovado':
        return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'Cancelado':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      default:
        return 'bg-slate-100 text-slate-600 ring-slate-500/20';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getColorClasses()}`}
    >
      {statusServicoLabel[status] ?? status}
    </span>
  );
}

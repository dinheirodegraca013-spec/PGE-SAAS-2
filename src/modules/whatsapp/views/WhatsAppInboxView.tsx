import React from 'react';
import { MessageCircle } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';

export default function WhatsAppInboxView() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Conversas WhatsApp</h2>
        <p className="mt-1 text-sm text-slate-500">
          Mensagens recebidas de clientes via WhatsApp aparecerão aqui, vinculadas ao cadastro de cliente correspondente.
        </p>
      </div>

      <EmptyState
        icon={MessageCircle}
        title="Nenhuma conversa arquivada ainda"
        description="Depende do endpoint de webhook do WhatsApp estar publicado e do histórico de mensagens ser implementado no backend."
      />
    </div>
  );
}

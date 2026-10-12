import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ChevronRight } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import StatusServicoBadge from '../components/StatusServicoBadge';
import { servicosService } from '../services/servicos.service';
import type { Servico } from '../types/servico';

export default function ServicosListView() {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await servicosService.listar();
      if (resultado.succeeded && resultado.value) {
        setServicos(resultado.value);
      } else {
        setErro(resultado.errors.join(' ') || 'Não foi possível carregar os serviços.');
      }
    } catch {
      setErro('Não foi possível conectar à API.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const formatarData = (iso: string) => {
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Serviços</h2>
        <p className="mt-1 text-sm text-slate-500">
          Atendimentos em andamento — nascem quando uma conversa do WhatsApp é aprovada como cliente.
        </p>
      </div>

      {carregando ? (
        <div className="card p-8 text-center text-sm text-slate-500">Carregando serviços...</div>
      ) : erro || servicos.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Nenhum serviço ainda"
          description={erro ?? 'Aprove uma conversa de WhatsApp para o primeiro serviço aparecer aqui.'}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Cliente
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Título / Escopo
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Criado em
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {servicos.map((servico) => (
                  <tr
                    key={servico.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => navigate(`/servicos/${servico.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-slate-900">{servico.clienteNome}</div>
                      <span className="text-[11px] text-slate-400">Origem: {servico.origem}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-slate-800">{servico.titulo || 'Sem título definido'}</div>
                      {servico.escopo && (
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{servico.escopo}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusServicoBadge status={servico.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatarData(servico.createdAtUtc)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                        Gerenciar <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

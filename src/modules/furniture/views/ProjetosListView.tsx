import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sofa, Plus, Calendar, ChevronRight } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import StatusProjetoBadge from '../components/StatusProjetoBadge';
import { projetosService } from '../services/projetos.service';
import type { ProjetoMovelPlanejado } from '../types/projeto';

export default function ProjetosListView() {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<ProjetoMovelPlanejado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarProjetos = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await projetosService.listar();
      if (resultado.succeeded && resultado.value) {
        setProjetos(resultado.value.items);
      } else {
        setErro(resultado.errors.join(' ') || 'Não foi possível carregar os projetos.');
      }
    } catch {
      setErro('Backend ainda não disponível para esta listagem.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarProjetos();
  }, []);

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Projetos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Projetos de móveis planejados em andamento e acompanhamento de produção.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary gap-2 self-start sm:self-auto cursor-pointer"
          onClick={() => {
            // Quick mock add or redirect
            if (projetos.length > 0) {
              navigate(`/projetos/${projetos[0].id}`);
            }
          }}
        >
          <Plus className="h-4 w-4" />
          Novo projeto
        </button>
      </div>

      {carregando ? (
        <div className="card p-8 text-center text-sm text-slate-500">Carregando projetos...</div>
      ) : erro || projetos.length === 0 ? (
        <EmptyState
          icon={Sofa}
          title="Nenhum projeto encontrado"
          description={erro ?? 'Cadastre o primeiro projeto para começar.'}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Projeto
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ambientes
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Valor Total
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {projetos.map((projeto) => (
                  <tr
                    key={projeto.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => navigate(`/projetos/${projeto.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-slate-900">{projeto.titulo}</div>
                      {projeto.observacoes && (
                        <div className="text-xs text-slate-500 mt-0.5 max-w-sm truncate">
                          {projeto.observacoes}
                        </div>
                      )}
                      {projeto.dataPrevistaEntrega && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                          <Calendar className="h-3 w-3" />
                          Entrega: {new Date(projeto.dataPrevistaEntrega).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {projeto.ambientes?.length ?? 0} ambiente(s)
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusProjetoBadge status={projeto.status} />
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                      {formatarMoeda(projeto.valorTotalOrcamento)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                        Ver <ChevronRight className="h-3.5 w-3.5" />
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

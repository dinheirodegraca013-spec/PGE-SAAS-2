import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ChevronRight, Plus, X } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import StatusServicoBadge from '../components/StatusServicoBadge';
import { servicosService } from '../services/servicos.service';
import { clientesService } from '@/modules/clientes/services/clientes.service';
import type { Servico } from '../types/servico';
import type { Cliente } from '@/modules/clientes/types/cliente';

export default function ServicosListView() {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Modal Novo Serviço
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [novoServico, setNovoServico] = useState({
    clienteId: '',
    titulo: '',
    escopo: '',
  });

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
      setErro('Não foi possível conectar ao Supabase.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarClientes = async () => {
    try {
      const res = await clientesService.listar();
      if (res.succeeded && res.value) {
        const lista = res.value;
        setClientes(lista);
        if (lista.length > 0) {
          setNovoServico((prev) => ({ ...prev, clienteId: prev.clienteId || lista[0].id }));
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    carregar();
    carregarClientes();
  }, []);

  const handleCriarServico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoServico.clienteId) {
      setErroModal('Selecione um cliente para abrir o atendimento.');
      return;
    }

    const clienteSelecionado = clientes.find((c) => c.id === novoServico.clienteId);
    if (!clienteSelecionado) {
      setErroModal('Cliente inválido.');
      return;
    }

    setErroModal(null);
    setSalvando(true);
    try {
      const res = await servicosService.criar({
        clienteId: clienteSelecionado.id,
        clienteNome: clienteSelecionado.nome,
        titulo: novoServico.titulo.trim() || undefined,
        escopo: novoServico.escopo.trim() || undefined,
      });

      if (!res.succeeded || !res.value) {
        setErroModal(res.errors.join(' ') || 'Erro ao criar serviço.');
        return;
      }

      setModalAberto(false);
      setNovoServico({ clienteId: clientes[0]?.id || '', titulo: '', escopo: '' });
      await carregar();
      navigate(`/servicos/${res.value.id}`);
    } catch (err: any) {
      setErroModal(err.message || 'Erro inesperado.');
    } finally {
      setSalvando(false);
    }
  };

  const formatarData = (iso: string) => {
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Serviços e Atendimentos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe atendimentos em andamento, escopos definidos e orçamentos vinculados.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary gap-2 self-start sm:self-auto cursor-pointer"
          onClick={() => {
            setModalAberto(true);
            setErroModal(null);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Atendimento
        </button>
      </div>

      {/* Modal Novo Serviço */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Novo Atendimento / Serviço</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700"
                onClick={() => setModalAberto(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCriarServico} className="space-y-4">
              <div>
                <label className="label-field text-xs">Cliente *</label>
                <select
                  className="input-field text-xs"
                  value={novoServico.clienteId}
                  onChange={(e) => setNovoServico({ ...novoServico, clienteId: e.target.value })}
                  required
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.telefoneWhatsApp ? `(${c.telefoneWhatsApp})` : ''}
                    </option>
                  ))}
                </select>
                {clientes.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Cadastre um cliente primeiro na aba "Clientes".
                  </p>
                )}
              </div>

              <div>
                <label className="label-field text-xs">Título do Atendimento</label>
                <input
                  type="text"
                  placeholder="Ex.: Cozinha planejada e balcão"
                  className="input-field text-xs"
                  value={novoServico.titulo}
                  onChange={(e) => setNovoServico({ ...novoServico, titulo: e.target.value })}
                />
              </div>

              <div>
                <label className="label-field text-xs">Descrição do Escopo Inicial</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes solicitados pelo cliente, medidas preliminares..."
                  className="input-field text-xs"
                  value={novoServico.escopo}
                  onChange={(e) => setNovoServico({ ...novoServico, escopo: e.target.value })}
                />
              </div>

              {erroModal && <p className="text-xs text-red-600 font-medium">{erroModal}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary text-xs" disabled={salvando}>
                  {salvando ? 'Criando...' : 'Abrir Atendimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {carregando ? (
        <div className="card p-8 text-center text-sm text-slate-500">Carregando serviços...</div>
      ) : erro ? (
        <div className="card p-6 border-red-200 bg-red-50 text-red-700 text-sm">
          <p className="font-semibold">Erro ao carregar serviços:</p>
          <p className="mt-1">{erro}</p>
          <button onClick={carregar} className="btn-secondary text-xs mt-3">
            Tentar novamente
          </button>
        </div>
      ) : servicos.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Nenhum serviço ainda"
          description="Clique em 'Novo Atendimento' para registrar um serviço ou aprove uma conversa do WhatsApp."
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

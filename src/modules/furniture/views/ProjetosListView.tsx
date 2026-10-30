import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sofa, Plus, Calendar, ChevronRight, X } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import StatusProjetoBadge from "../components/StatusProjetoBadge";
import { projetosService } from "../services/projetos.service";
import { clientesService } from "@/modules/clientes/services/clientes.service";
import type { ProjetoMovelPlanejado } from "../types/projeto";
import type { Cliente } from "@/modules/clientes/types/cliente";

export default function ProjetosListView() {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<ProjetoMovelPlanejado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Modal Novo Projeto
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [novoProjeto, setNovoProjeto] = useState({
    titulo: "",
    clienteId: "",
    valorTotalOrcamento: 0,
    observacoes: "",
  });

  const carregarProjetos = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await projetosService.listar();
      if (resultado.succeeded && resultado.value) {
        setProjetos(resultado.value.items);
      } else {
        setErro(
          resultado.errors.join(" ") ||
            "Não foi possível carregar os projetos.",
        );
      }
    } catch {
      setErro("Falha ao comunicar com o banco de dados.");
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
          setNovoProjeto((prev) => ({
            ...prev,
            clienteId: prev.clienteId || lista[0].id,
          }));
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    carregarProjetos();
    carregarClientes();
  }, []);

  const handleCriarProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProjeto.titulo.trim()) {
      setErroModal("Informe o título do projeto.");
      return;
    }

    setErroModal(null);
    setSalvando(true);
    try {
      const res = await projetosService.criar({
        titulo: novoProjeto.titulo.trim(),
        clienteId: novoProjeto.clienteId || undefined,
        valorTotalOrcamento: Number(novoProjeto.valorTotalOrcamento) || 0,
        observacoes: novoProjeto.observacoes.trim() || undefined,
        status: 0,
        ambientes: [],
      });

      if (!res.succeeded) {
        setErroModal(res.errors.join(" ") || "Erro ao criar projeto.");
        return;
      }

      setModalAberto(false);
      setNovoProjeto({
        titulo: "",
        clienteId: clientes[0]?.id || "",
        valorTotalOrcamento: 0,
        observacoes: "",
      });
      await carregarProjetos();
    } catch (err: any) {
      setErroModal(err.message || "Erro inesperado.");
    } finally {
      setSalvando(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Projetos, Orçamentos e Produção
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhamento de produção, medições e execução no Supabase.
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
          Novo projeto
        </button>
      </div>

      {/* Modal de Criação de Projeto */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Novo Projeto de Marcenaria
              </h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700"
                onClick={() => setModalAberto(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCriarProjeto} className="space-y-4">
              <div>
                <label className="label-field text-xs">
                  Título do Projeto *
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Cozinha Integrada & Closet"
                  className="input-field text-xs"
                  value={novoProjeto.titulo}
                  onChange={(e) =>
                    setNovoProjeto({ ...novoProjeto, titulo: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="label-field text-xs">Cliente Vinculado</label>
                <select
                  className="input-field text-xs"
                  value={novoProjeto.clienteId}
                  onChange={(e) =>
                    setNovoProjeto({
                      ...novoProjeto,
                      clienteId: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione um cliente (opcional)</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}{" "}
                      {c.telefoneWhatsApp ? `(${c.telefoneWhatsApp})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-field text-xs">
                  Valor Estimado do Orçamento (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="input-field text-xs"
                  value={novoProjeto.valorTotalOrcamento || ""}
                  onChange={(e) =>
                    setNovoProjeto({
                      ...novoProjeto,
                      valorTotalOrcamento:
                        Number(e.target.value.replace(",", ".")) || 0,
                    })
                  }
                />
              </div>

              <div>
                <label className="label-field text-xs">
                  Observações / Especificações
                </label>
                <textarea
                  rows={3}
                  placeholder="Materiais preferenciais, acabamentos e orientações técnicas..."
                  className="input-field text-xs"
                  value={novoProjeto.observacoes}
                  onChange={(e) =>
                    setNovoProjeto({
                      ...novoProjeto,
                      observacoes: e.target.value,
                    })
                  }
                />
              </div>

              {erroModal && (
                <p className="text-xs text-red-600 font-medium">{erroModal}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Criar Projeto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {carregando ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          Carregando projetos de marcenaria...
        </div>
      ) : erro ? (
        <div className="card p-6 border-red-200 bg-red-50 text-red-700 text-sm">
          <p className="font-semibold">Erro ao carregar projetos:</p>
          <p className="mt-1">{erro}</p>
          <button
            onClick={carregarProjetos}
            className="btn-secondary text-xs mt-3"
          >
            Tentar novamente
          </button>
        </div>
      ) : projetos.length === 0 ? (
        <EmptyState
          icon={Sofa}
          title="Nenhum projeto encontrado"
          description="Cadastre o primeiro projeto de marcenaria para começar a acompanhar."
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
                      <div className="text-sm font-semibold text-slate-900">
                        {projeto.titulo}
                      </div>
                      {projeto.observacoes && (
                        <div className="text-xs text-slate-500 mt-0.5 max-w-sm truncate">
                          {projeto.observacoes}
                        </div>
                      )}
                      {projeto.dataPrevistaEntrega && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                          <Calendar className="h-3 w-3" />
                          Entrega:{" "}
                          {new Date(
                            projeto.dataPrevistaEntrega,
                          ).toLocaleDateString("pt-BR")}
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


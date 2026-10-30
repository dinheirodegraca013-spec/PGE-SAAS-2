import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Plus,
  Trash2,
  FileText,
  ExternalLink,
  ArrowLeft,
  Check,
  Sparkles,
} from "lucide-react";
import StatusServicoBadge from "../components/StatusServicoBadge";
import { servicosService } from "../services/servicos.service";
import { StatusServico, statusServicoLabel } from "../types/servico";
import type { Servico } from "../types/servico";
import { orcamentosService } from "@/modules/orcamentos/services/orcamentos.service";
import type {
  Orcamento,
  ItemOrcamentoInput,
} from "@/modules/orcamentos/types/orcamento";

function orcamentoServiceUrl(token?: string): string {
  return token ? `/orcamento/${encodeURIComponent(token)}` : "/servicos";
}

export default function ServicoDetalheView() {
  const { id } = useParams<{ id: string }>();
  const servicoId = id || "";

  // Serviço
  const [servico, setServico] = useState<Servico | null>(null);
  const [carregandoServico, setCarregandoServico] = useState(true);
  const [erroServico, setErroServico] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [escopo, setEscopo] = useState("");
  const [salvandoEscopo, setSalvandoEscopo] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);

  // Orçamentos
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [carregandoOrcamentos, setCarregandoOrcamentos] = useState(true);
  const [mostrarFormOrcamento, setMostrarFormOrcamento] = useState(false);
  const [itensNovoOrcamento, setItensNovoOrcamento] = useState<
    ItemOrcamentoInput[]
  >([{ descricao: "", quantidade: 1, valorUnitario: 0 }]);
  const [observacoesNovoOrcamento, setObservacoesNovoOrcamento] = useState("");
  const [enviandoOrcamento, setEnviandoOrcamento] = useState(false);
  const [erroOrcamento, setErroOrcamento] = useState<string | null>(null);

  const carregarServico = async () => {
    setCarregandoServico(true);
    setErroServico(null);
    try {
      const resultado = await servicosService.obterPorId(servicoId);
      if (resultado.succeeded && resultado.value) {
        setServico(resultado.value);
        setTitulo(resultado.value.titulo ?? "");
        setEscopo(resultado.value.escopo ?? "");
      } else {
        setErroServico(resultado.errors.join(" ") || "Serviço não encontrado.");
      }
    } catch {
      setErroServico("Não foi possível conectar à API.");
    } finally {
      setCarregandoServico(false);
    }
  };

  const carregarOrcamentos = async () => {
    setCarregandoOrcamentos(true);
    try {
      const resultado = await orcamentosService.listarPorServico(servicoId);
      if (resultado.succeeded && resultado.value) {
        setOrcamentos(resultado.value);
      }
    } finally {
      setCarregandoOrcamentos(false);
    }
  };

  useEffect(() => {
    if (servicoId) {
      carregarServico();
      carregarOrcamentos();
    }
  }, [servicoId]);

  const salvarEscopo = async () => {
    setSalvandoEscopo(true);
    try {
      const resultado = await servicosService.atualizar(servicoId, {
        titulo: titulo || undefined,
        escopo: escopo || undefined,
      });
      if (resultado.succeeded && resultado.value) {
        setServico(resultado.value);
        setSalvoComSucesso(true);
        setTimeout(() => setSalvoComSucesso(false), 3000);
      }
    } finally {
      setSalvandoEscopo(false);
    }
  };

  const mudarStatus = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chave = e.target.value as keyof typeof StatusServico;
    const resultado = await servicosService.atualizar(servicoId, {
      status: StatusServico[chave],
    });
    if (resultado.succeeded && resultado.value) {
      setServico(resultado.value);
    }
  };

  const totalNovoOrcamento = itensNovoOrcamento.reduce(
    (soma, item) => soma + item.quantidade * item.valorUnitario,
    0,
  );

  const adicionarItem = () => {
    setItensNovoOrcamento([
      ...itensNovoOrcamento,
      { descricao: "", quantidade: 1, valorUnitario: 0 },
    ]);
  };

  const removerItem = (indice: number) => {
    if (itensNovoOrcamento.length > 1) {
      setItensNovoOrcamento(itensNovoOrcamento.filter((_, i) => i !== indice));
    }
  };

  const atualizarItem = (
    indice: number,
    campo: keyof ItemOrcamentoInput,
    valor: any,
  ) => {
    const novos = [...itensNovoOrcamento];
    novos[indice] = { ...novos[indice], [campo]: valor };
    setItensNovoOrcamento(novos);
  };

  const criarOrcamento = async () => {
    setErroOrcamento(null);
    const itensValidos = itensNovoOrcamento.filter(
      (item) => item.descricao.trim().length > 0,
    );
    if (itensValidos.length === 0) {
      setErroOrcamento("Adicione pelo menos um item com descrição.");
      return;
    }

    setEnviandoOrcamento(true);
    try {
      const resultado = await orcamentosService.criar(servicoId, {
        itens: itensValidos,
        observacoesGerais: observacoesNovoOrcamento || undefined,
      });

      if (!resultado.succeeded) {
        setErroOrcamento(
          resultado.errors.join(" ") || "Não foi possível criar o orçamento.",
        );
        return;
      }

      setMostrarFormOrcamento(false);
      setItensNovoOrcamento([
        { descricao: "", quantidade: 1, valorUnitario: 0 },
      ]);
      setObservacoesNovoOrcamento("");
      await carregarOrcamentos();
      await carregarServico();
    } finally {
      setEnviandoOrcamento(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  if (carregandoServico) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        Carregando atendimento...
      </div>
    );
  }

  if (erroServico || !servico) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium text-red-600">
          {erroServico ?? "Serviço não encontrado"}
        </p>
        <Link
          to="/servicos"
          className="btn-secondary mt-4 inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para Serviços
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/servicos"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {servico.clienteNome}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Serviço aberto em{" "}
                {new Date(servico.createdAtUtc).toLocaleDateString("pt-BR")} ·
                Origem: {servico.origem}
              </p>
            </div>
            <StatusServicoBadge status={servico.status} />
          </div>
        </div>
      </div>

      {/* Escopo do Serviço */}
      <div className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Escopo do Serviço
          </h3>
          {salvoComSucesso && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Salvo com sucesso!
            </span>
          )}
        </div>

        <div>
          <label className="label-field">Título do Projeto / Atendimento</label>
          <input
            type="text"
            placeholder="Ex.: Cozinha planejada e bancada"
            className="input-field"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        <div>
          <label className="label-field">Descrição do escopo</label>
          <textarea
            rows={4}
            placeholder="Descreva o que foi alinhado com o cliente, medidas preliminares, materiais solicitados..."
            className="input-field"
            value={escopo}
            onChange={(e) => setEscopo(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            className="btn-primary cursor-pointer"
            disabled={salvandoEscopo}
            onClick={salvarEscopo}
          >
            {salvandoEscopo ? "Salvando..." : "Salvar escopo"}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              Mudar status:
            </span>
            <select
              value={servico.status}
              className="input-field w-auto py-1.5 text-xs font-medium"
              onChange={mudarStatus}
            >
              {Object.entries(statusServicoLabel).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orçamentos do Serviço */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Orçamentos Vinculados
            </h3>
            <p className="text-xs text-slate-500">
              Gere propostas comerciais e compartilhe o link de aceite
              eletrônico com o cliente.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary gap-1.5 px-3 py-1.5 text-xs cursor-pointer"
            onClick={() => setMostrarFormOrcamento(!mostrarFormOrcamento)}
          >
            <Plus className="h-4 w-4" />
            {mostrarFormOrcamento ? "Cancelar" : "Novo orçamento"}
          </button>
        </div>

        {/* Formulário de Novo Orçamento */}
        {mostrarFormOrcamento && (
          <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/20 p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900">
              Itens do Orçamento
            </h4>

            <div className="space-y-2">
              {itensNovoOrcamento.map((item, indice) => (
                <div
                  key={indice}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <input
                      type="text"
                      placeholder="Descrição do item ou ambiente"
                      className="input-field text-xs"
                      value={item.descricao}
                      onChange={(e) =>
                        atualizarItem(indice, "descricao", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Qtd"
                      className="input-field text-xs text-center"
                      value={item.quantidade}
                      onChange={(e) =>
                        atualizarItem(
                          indice,
                          "quantidade",
                          Number(e.target.value.replace(",", ".")) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Valor Unit. (R$)"
                      className="input-field text-xs"
                      value={item.valorUnitario}
                      onChange={(e) =>
                        atualizarItem(
                          indice,
                          "valorUnitario",
                          Number(e.target.value.replace(",", ".")) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-center">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-600 p-1"
                      onClick={() => removerItem(indice)}
                      title="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
              onClick={adicionarItem}
            >
              + Adicionar outro item
            </button>

            <div>
              <label className="label-field text-xs">
                Observações Gerais / Condições Comerciais
              </label>
              <textarea
                rows={2}
                placeholder="Ex.: Validade de 15 dias, pagamento 50% de entrada e 50% na entrega..."
                className="input-field text-xs"
                value={observacoesNovoOrcamento}
                onChange={(e) => setObservacoesNovoOrcamento(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div>
                <span className="text-xs text-slate-500">
                  Valor Total Calculado:
                </span>
                <p className="text-lg font-bold text-slate-900">
                  {formatarMoeda(totalNovoOrcamento)}
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                disabled={enviandoOrcamento}
                onClick={criarOrcamento}
              >
                {enviandoOrcamento ? "Criando..." : "Salvar e Gerar Orçamento"}
              </button>
            </div>

            {erroOrcamento && (
              <p className="text-xs text-red-600">{erroOrcamento}</p>
            )}
          </div>
        )}

        {/* Lista de Orçamentos Existentes */}
        {carregandoOrcamentos ? (
          <div className="text-xs text-slate-500 py-4 text-center">
            Carregando orçamentos...
          </div>
        ) : orcamentos.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">
            Nenhum orçamento emitido para este atendimento ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {orcamentos.map((orcamento) => (
              <div
                key={orcamento.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold text-slate-900">
                        {formatarMoeda(orcamento.valorTotal)}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          orcamento.status === "Assinado"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                        }`}
                      >
                        {orcamento.status === "Assinado"
                          ? "Assinado pelo Cliente"
                          : "Aguardando Aceite"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {orcamento.itens?.length ?? 0} item(ns)
                      {orcamento.assinadoPorNome &&
                        ` · Assinado por: ${orcamento.assinadoPorNome}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to={orcamentoServiceUrl(orcamento.publicToken)}
                    target="_blank"
                    className="btn-secondary text-xs gap-1.5 py-1.5 px-3"
                  >
                    <span>Ver Proposta Pública</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


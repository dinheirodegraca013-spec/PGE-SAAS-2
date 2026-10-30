import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  X,
  Phone,
  UserPlus,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { conversasPendentesService } from "../services/conversasPendentes.service";
import type { ConversaPendente } from "../types/conversaPendente";

export default function ConversasPendentesView() {
  const navigate = useNavigate();
  const [conversas, setConversas] = useState<ConversaPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Controle de aprovação
  const [conversaEmAprovacao, setConversaEmAprovacao] = useState<string | null>(
    null,
  );
  const [nomeCliente, setNomeCliente] = useState("");
  const [processando, setProcessando] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await conversasPendentesService.listar("Pendente");
      if (resultado.succeeded && resultado.value) {
        setConversas(resultado.value);
      } else {
        setErro(
          resultado.errors.join(" ") ||
            "Não foi possível carregar as conversas.",
        );
      }
    } catch {
      setErro("Não foi possível conectar à API.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirAprovacao = (conversa: ConversaPendente) => {
    setConversaEmAprovacao(conversa.id);
    setNomeCliente("");
  };

  const cancelarAprovacao = () => {
    setConversaEmAprovacao(null);
    setNomeCliente("");
  };

  const confirmarAprovacao = async (id: string) => {
    setProcessando(id);
    try {
      const resultado = await conversasPendentesService.aprovar(id, {
        nome: nomeCliente.trim() || undefined,
      });

      if (resultado.succeeded && resultado.value) {
        setConversas((prev) => prev.filter((c) => c.id !== id));
        setConversaEmAprovacao(null);
        setSucessoMsg(
          "Conversa aprovada! Cliente e atendimento criados com sucesso.",
        );
        setTimeout(() => setSucessoMsg(null), 4000);
      } else {
        setErro(
          resultado.errors.join(" ") || "Não foi possível aprovar a conversa.",
        );
      }
    } finally {
      setProcessando(null);
    }
  };

  const ignorar = async (id: string) => {
    setProcessando(id);
    try {
      const resultado = await conversasPendentesService.ignorar(id);
      if (resultado.succeeded) {
        setConversas((prev) => prev.filter((c) => c.id !== id));
      } else {
        setErro(
          resultado.errors.join(" ") || "Não foi possível ignorar a conversa.",
        );
      }
    } finally {
      setProcessando(null);
    }
  };

  const formatarData = (iso: string) => {
    return new Date(iso).toLocaleString("pt-BR");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Conversas WhatsApp
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Mensagens recebidas de números desconhecidos. Aprove para criar o
            cliente e abrir um serviço automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/whatsapp/configuracao")}
          className="btn-secondary gap-2 self-start sm:self-auto text-xs"
        >
          <Phone className="h-3.5 w-3.5 text-slate-500" />
          Configurar Conexão Meta
        </button>
      </div>

      {sucessoMsg && (
        <div className="rounded-lg bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
          ✓ {sucessoMsg}
        </div>
      )}

      {carregando ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          Carregando mensagens recebidas...
        </div>
      ) : erro ? (
        <div
          role="alert"
          className="card border-red-200 bg-red-50 p-6 text-center"
        >
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <h3 className="mt-3 text-sm font-semibold text-red-900">
            Não foi possível carregar as conversas
          </h3>
          <p className="mt-1 text-sm text-red-700">{erro}</p>
          <button
            type="button"
            onClick={carregar}
            className="btn-secondary mt-4 gap-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </button>
        </div>
      ) : conversas.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="Nenhuma conversa pendente"
          description={
            erro ??
            "Quando alguém mandar mensagem para o seu número WhatsApp conectado, ela aparecerá aqui para triagem."
          }
        />
      ) : (
        <div className="space-y-3">
          {conversas.map((conversa) => (
            <div
              key={conversa.id}
              className="card p-5 border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Phone className="h-3.5 w-3.5" />
                    </span>
                    <p className="font-bold text-slate-900 text-base">
                      {conversa.telefoneOrigemE164}
                    </p>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-600/20">
                      Pendente de Triagem
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    "{conversa.ultimaMensagemTexto || "(mensagem sem texto)"}"
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {conversa.quantidadeMensagens} mensagem(ns) · Recebida em{" "}
                    {formatarData(conversa.ultimaMensagemEmUtc)}
                  </p>
                </div>

                {conversaEmAprovacao !== conversa.id && (
                  <div className="flex flex-shrink-0 gap-2 self-end sm:self-start">
                    <button
                      type="button"
                      className="btn-primary gap-1.5 px-3.5 py-2 text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                      disabled={processando === conversa.id}
                      onClick={() => abrirAprovacao(conversa)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Aprovar como Cliente
                    </button>
                    <button
                      type="button"
                      className="btn-secondary gap-1.5 px-3 py-2 text-xs cursor-pointer"
                      disabled={processando === conversa.id}
                      onClick={() => ignorar(conversa.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Ignorar
                    </button>
                  </div>
                )}
              </div>

              {/* Formulário inline para aprovação com nome opcional */}
              {conversaEmAprovacao === conversa.id && (
                <div className="mt-4 border-t border-slate-100 pt-4 bg-emerald-50/40 rounded-lg p-3">
                  <label className="label-field text-xs text-slate-700 font-semibold">
                    Nome do Cliente a Cadastrar (opcional)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Deixe em branco para usar o número de telefone"
                      className="input-field text-xs flex-1 bg-white"
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-primary px-4 py-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 shrink-0"
                      disabled={processando === conversa.id}
                      onClick={() => confirmarAprovacao(conversa.id)}
                    >
                      {processando === conversa.id
                        ? "Aprovando..."
                        : "Confirmar e Criar Atendimento"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-3 py-2.5 text-xs shrink-0"
                      onClick={cancelarAprovacao}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


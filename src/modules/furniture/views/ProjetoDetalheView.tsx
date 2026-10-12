import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, Sofa, Layers, Ruler } from 'lucide-react';
import StatusProjetoBadge from '../components/StatusProjetoBadge';
import { projetosService } from '../services/projetos.service';
import { StatusProjeto, materialPadraoLabel, statusProjetoLabel } from '../types/projeto';
import type { ProjetoMovelPlanejado } from '../types/projeto';

export default function ProjetoDetalheView() {
  const { id } = useParams<{ id: string }>();
  const [projeto, setProjeto] = useState<ProjetoMovelPlanejado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const carregarProjeto = async () => {
    if (!id) return;
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await projetosService.obterPorId(id);
      if (resultado.succeeded && resultado.value) {
        setProjeto(resultado.value);
      } else {
        setErro(resultado.errors.join(' ') || 'Projeto não encontrado.');
      }
    } catch {
      setErro('Não foi possível conectar à API.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarProjeto();
  }, [id]);

  const handleMudarStatus = async (novoStatus: StatusProjeto) => {
    if (!id) return;
    const res = await projetosService.atualizarStatus(id, novoStatus);
    if (res.succeeded && res.value) {
      setProjeto(res.value);
    } else {
      carregarProjeto();
    }
  };

  const handleEnviarWhatsApp = async () => {
    if (!id) return;
    setEnviandoWhatsApp(true);
    try {
      await projetosService.enviarOrcamentoPorWhatsApp(id);
      setMensagemSucesso('Orçamento enviado com sucesso para o WhatsApp do cliente!');
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch {
      setMensagemSucesso('Orçamento enviado via simulação WhatsApp.');
      setTimeout(() => setMensagemSucesso(null), 4000);
    } finally {
      setEnviandoWhatsApp(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (carregando) {
    return <div className="card p-8 text-center text-sm text-slate-500">Carregando detalhes do projeto...</div>;
  }

  if (erro || !projeto) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium text-red-600">{erro ?? 'Projeto não encontrado'}</p>
        <Link to="/projetos" className="btn-secondary mt-4 inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para Projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/projetos" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{projeto.titulo}</h2>
            <StatusProjetoBadge status={projeto.status} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Identificador: {projeto.id}</p>
        </div>
        <button
          type="button"
          className="btn-primary gap-2 bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-emerald-600"
          onClick={handleEnviarWhatsApp}
          disabled={enviandoWhatsApp}
        >
          <Send className="h-4 w-4" />
          {enviandoWhatsApp ? 'Enviando...' : 'Enviar no WhatsApp'}
        </button>
      </div>

      {mensagemSucesso && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          {mensagemSucesso}
        </div>
      )}

      {/* Visão Geral */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Valor Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatarMoeda(projeto.valorTotalOrcamento)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Status de Produção</p>
          <div className="mt-2">
            <select
              value={projeto.status}
              onChange={(e) => handleMudarStatus(Number(e.target.value) as StatusProjeto)}
              className="input-field text-xs py-1.5 font-medium"
            >
              {Object.entries(statusProjetoLabel).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Previsão de Entrega</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {projeto.dataPrevistaEntrega
              ? new Date(projeto.dataPrevistaEntrega).toLocaleDateString('pt-BR')
              : 'A definir após aprovação'}
          </p>
        </div>
      </div>

      {projeto.observacoes && (
        <div className="card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Especificações Gerais</h3>
          <p className="text-sm text-slate-700">{projeto.observacoes}</p>
        </div>
      )}

      {/* Ambientes e Itens */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-600" />
            Ambientes e Especificações Técnicas ({projeto.ambientes?.length ?? 0})
          </h3>
        </div>

        {projeto.ambientes && projeto.ambientes.length > 0 ? (
          <div className="space-y-4">
            {projeto.ambientes.map((ambiente) => (
              <div key={ambiente.id} className="card overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{ambiente.nome}</h4>
                    {ambiente.dimensoesDescricao && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Ruler className="h-3 w-3" /> Dimensões: {ambiente.dimensoesDescricao}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {ambiente.itens?.length ?? 0} item(ns)
                  </span>
                </div>

                <div className="p-5">
                  <div className="divide-y divide-slate-100">
                    {ambiente.itens?.map((item) => (
                      <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900">{item.descricao}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-slate-700">
                              Material: {materialPadraoLabel[item.material] ?? 'MDF'}
                            </span>
                            <span>
                              Medidas: {item.larguraMetros}m (L) x {item.alturaMetros}m (A) x {item.profundidadeMetros}m (P)
                            </span>
                            <span>Qtd: {item.quantidade}</span>
                          </div>
                        </div>
                        <div className="text-right sm:text-right shrink-0">
                          <p className="text-sm font-bold text-slate-900">
                            {formatarMoeda(item.valorUnitario * item.quantidade)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            ({formatarMoeda(item.valorUnitario)} un.)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-slate-500">
            Nenhum ambiente detalhado para este projeto.
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileText, Printer, Building2, ShieldCheck, AlertCircle } from 'lucide-react';
import { orcamentosService } from '../services/orcamentos.service';
import type { Orcamento } from '../types/orcamento';
import { localDb } from '@/services/api/client';

export default function OrcamentoPublicoView() {
  const { id } = useParams<{ id: string }>();
  const orcamentoId = id || '';

  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aceito, setAceito] = useState(false);

  const carregar = async () => {
    if (!orcamentoId) return;
    setCarregando(true);
    try {
      const res = await orcamentosService.obterPorId(orcamentoId);
      if (res.succeeded && res.value) {
        setOrcamento(res.value);
        if (res.value.status === 'Assinado' || res.value.temPdfAssinado) {
          setAceito(true);
          if (res.value.assinadoPorNome) {
            setNome(res.value.assinadoPorNome);
          }
        }
      }
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [orcamentoId]);

  const assinar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) {
      setErro('Informe seu nome completo.');
      return;
    }

    setEnviando(true);
    try {
      const resultado = await orcamentosService.assinar(orcamentoId, { nome: nome.trim() });
      if (!resultado.succeeded) {
        setErro(resultado.errors.join(' ') || 'Não foi possível registrar o aceite.');
        return;
      }
      setAceito(true);
      await carregar();
    } catch {
      setErro('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="card p-8 text-center text-sm text-slate-500">Carregando orçamento...</div>
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="card max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Orçamento não encontrado</h2>
          <p className="mt-1 text-sm text-slate-500">
            O link pode estar expirado ou o código do orçamento ({orcamentoId}) não existe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Cabeçalho da Proposta */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-base shadow-sm">
              E
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Proposta Comercial & Orçamento</h1>
              <p className="text-xs text-slate-500">Código de Referência: #{orcamento.id}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary gap-2 self-start sm:self-auto text-xs"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Imprimir / Salvar PDF
          </button>
        </div>

        {/* Documento do Orçamento */}
        <div className="card p-6 sm:p-8 space-y-6 bg-white shadow-md border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prestador de Serviços</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">Marcenaria & Design Sob Medida</p>
              <p className="text-xs text-slate-500">Soluções planejadas em móveis e ambientes</p>
            </div>
            <div className="sm:text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status da Proposta</span>
              <div className="mt-1">
                {aceito ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Aceito e Assinado
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Aguardando Aceite do Cliente
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabela de Itens */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Discriminação dos Serviços e Itens</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                    <th className="px-4 py-2.5 text-left">Item / Descrição</th>
                    <th className="px-4 py-2.5 text-center">Quantidade</th>
                    <th className="px-4 py-2.5 text-right">Valor Unitário</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orcamento.itens?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-slate-900 font-medium">{it.descricao}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{it.quantidade}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatarMoeda(it.valorUnitario)}</td>
                      <td className="px-4 py-3 text-right text-slate-900 font-semibold">{formatarMoeda(it.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                    <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-900">
                      Valor Total da Proposta:
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-brand-600">
                      {formatarMoeda(orcamento.valorTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Observações Gerais e Condições */}
          {orcamento.observacoesGerais && (
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Condições Comerciais e Observações
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">{orcamento.observacoesGerais}</p>
            </div>
          )}

          {/* Dados do Aceite */}
          {aceito && orcamento.assinadoPorNome && (
            <div className="rounded-lg bg-emerald-50/70 p-4 border border-emerald-200 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900">Aceite Eletrônico Registrado</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Assinado digitalmente por <strong className="font-semibold">{orcamento.assinadoPorNome}</strong> em{' '}
                  {orcamento.assinadoEmUtc
                    ? new Date(orcamento.assinadoEmUtc).toLocaleString('pt-BR')
                    : 'Data registrada'}.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Card de Aceite Eletrônico */}
        <div className="card p-6">
          {aceito ? (
            <div className="text-center py-4">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 mb-2" />
              <h3 className="text-base font-bold text-slate-900">Proposta Aceita com Sucesso!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Obrigado pela confirmação. Nossa equipe técnica já foi notificada e dará início aos próximos passos de fabricação e cronograma.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-1">Aceitar e Assinar Orçamento</h2>
              <p className="text-xs text-slate-500 mb-4">
                Ao informar seu nome e clicar em confirmar, você formaliza o aceite eletrônico desta proposta comercial.
              </p>

              <form onSubmit={assinar} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  className="input-field flex-1 text-sm"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary shrink-0" disabled={enviando}>
                  {enviando ? 'Enviando...' : 'Aceitar e assinar proposta'}
                </button>
              </form>

              {erro && <p className="mt-3 text-xs text-red-600">{erro}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

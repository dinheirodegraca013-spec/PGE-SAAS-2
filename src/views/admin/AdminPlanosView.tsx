import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PackageCheck,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { adminService } from '@/services/admin/admin.service';
import { SaaSPlano } from '@/types/admin';

export default function AdminPlanosView() {
  const [planos, setPlanos] = useState<SaaSPlano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Modal de Criação / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [planoEmEdicao, setPlanoEmEdicao] = useState<Partial<SaaSPlano>>({
    nome: '',
    descricao: '',
    preco: 89.9,
    periodicidade: 'mensal',
    status: 'ativo',
    recursos: [],
    ordem: 1,
  });
  const [recursoInput, setRecursoInput] = useState('');

  const carregarPlanos = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await adminService.listarPlanos();
      if (res.succeeded && res.value) {
        setPlanos(res.value);
      } else {
        setErro(res.errors.join(' '));
      }
    } catch {
      setErro('Erro ao carregar planos.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPlanos();
  }, []);

  const abrirModalCriacao = () => {
    setPlanoEmEdicao({
      nome: '',
      descricao: '',
      preco: 99.0,
      periodicidade: 'mensal',
      status: 'ativo',
      recursos: [],
      ordem: planos.length,
    });
    setRecursoInput('');
    setModalAberto(true);
  };

  const abrirModalEdicao = (plano: SaaSPlano) => {
    setPlanoEmEdicao({ ...plano });
    setRecursoInput('');
    setModalAberto(true);
  };

  const adicionarRecurso = () => {
    if (!recursoInput.trim()) return;
    const novosRecursos = [...(planoEmEdicao.recursos || []), recursoInput.trim()];
    setPlanoEmEdicao({ ...planoEmEdicao, recursos: novosRecursos });
    setRecursoInput('');
  };

  const removerRecurso = (idx: number) => {
    const novosRecursos = (planoEmEdicao.recursos || []).filter((_, i) => i !== idx);
    setPlanoEmEdicao({ ...planoEmEdicao, recursos: novosRecursos });
  };

  const handleSalvarPlano = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planoEmEdicao.nome?.trim()) {
      alert('Informe o nome do plano.');
      return;
    }

    setSalvando(true);
    try {
      const res = await adminService.salvarPlano(planoEmEdicao);
      if (res.succeeded) {
        setModalAberto(false);
        await carregarPlanos();
      } else {
        alert(res.errors.join(' '));
      }
    } catch {
      alert('Erro ao salvar plano no banco de dados.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirPlano = async (plano: SaaSPlano) => {
    if (!window.confirm(`Excluir definitivamente o plano "${plano.nome}"? Essa ação não pode ser desfeita.`)) return;
    const res = await adminService.excluirPlano(plano.id);
    if (!res.succeeded) { alert(res.errors.join(' ')); return; }
    await carregarPlanos();
  };

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Planos Comerciais do SaaS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre, edite e controle a disponibilidade e os recursos de cada plano de assinatura.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/financeiro/links"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <LinkIcon className="h-3.5 w-3.5 text-slate-500" />
            Configurar Links de Pagamento
          </Link>
          <button
            type="button"
            onClick={abrirModalCriacao}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-2xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Plano
          </button>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {erro}
        </div>
      )}

      {/* Ferramenta discreta para copiar os retornos do checkout no Mercado Pago */}
      <details className="rounded-xl border border-slate-200 bg-white shadow-2xs">
        <summary className="cursor-pointer select-none px-4 py-3 text-xs font-semibold text-slate-500 hover:text-slate-800">
          Configuração avançada · URLs de retorno do Mercado Pago
        </summary>
        <div className="border-t border-slate-100 p-4 sm:p-5">
          <p className="mb-4 max-w-3xl text-xs leading-5 text-slate-500">Copie a URL correspondente e cole no campo de retorno do checkout do Mercado Pago. Estas páginas ficam fora do menu público. O retorno não libera o plano automaticamente: a confirmação deve vir do Mercado Pago por webhook ou validação segura.</p>
          <div className="space-y-3">
            {[
              { slug: 'basico', nome: 'Básico' },
              { slug: 'profissional', nome: 'Profissional' },
              { slug: 'premium', nome: 'Premium/Plus' },
            ].map((item) => {
              const url = `${window.location.origin}/pagamento/obrigado/${item.slug}`;
              return (
                <div key={item.slug} className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center">
                  <div className="w-28 shrink-0 text-xs font-semibold text-slate-700">{item.nome}</div>
                  <code className="min-w-0 flex-1 break-all text-[11px] text-slate-600">{url}</code>
                  <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); alert(`Link do plano ${item.nome} copiado.`); } catch { window.prompt('Copie a URL de retorno:', url); } }} className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Copiar link</button>
                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center px-2 py-2 text-xs font-semibold text-brand-600 hover:text-brand-700">Pré-visualizar</a>
                </div>
              );
            })}
          </div>
        </div>
      </details>

      {/* Grid de Planos */}
      {carregando ? (
        <div className="p-12 text-center text-xs text-slate-400">Carregando planos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planos.map((plano) => (
            <div
              key={plano.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-2xs hover:shadow-xs transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      plano.status === 'ativo'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {plano.status === 'ativo' ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-slate-400" />
                    )}
                    {plano.status === 'ativo' ? 'Ativo no Catálogo' : 'Inativo'}
                  </span>
                  <span className="text-xs text-slate-400 uppercase font-mono">
                    {plano.periodicidade}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-3">{plano.nome}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plano.descricao}</p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {formatarMoeda(plano.preco)}
                    </span>
                    <span className="text-xs text-slate-400">/{plano.periodicidade}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Recursos Inclusos:
                  </span>
                  {plano.recursos.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Nenhum recurso especificado.</span>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {plano.recursos.map((rec, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-brand-600 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => abrirModalEdicao(plano)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                  Editar Plano
                </button>
                <button type="button" title="Excluir plano" aria-label="Excluir plano" onClick={() => handleExcluirPlano(plano)} className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                <Link
                  to="/admin/financeiro/links"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Ver Checkout →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Plano */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {planoEmEdicao.id ? 'Editar Plano Comercial' : 'Criar Novo Plano do SaaS'}
            </h3>

            <form onSubmit={handleSalvarPlano} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Plano *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Profissional Pro"
                    value={planoEmEdicao.nome}
                    onChange={(e) => setPlanoEmEdicao({ ...planoEmEdicao, nome: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição Comercial
                  </label>
                  <input
                    type="text"
                    placeholder="Breve descrição dos clientes ideais"
                    value={planoEmEdicao.descricao}
                    onChange={(e) => setPlanoEmEdicao({ ...planoEmEdicao, descricao: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={planoEmEdicao.preco}
                    onChange={(e) =>
                      setPlanoEmEdicao({ ...planoEmEdicao, preco: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Periodicidade *
                  </label>
                  <select
                    value={planoEmEdicao.periodicidade}
                    onChange={(e) =>
                      setPlanoEmEdicao({ ...planoEmEdicao, periodicidade: e.target.value as any })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status no Catálogo
                  </label>
                  <select
                    value={planoEmEdicao.status}
                    onChange={(e) =>
                      setPlanoEmEdicao({ ...planoEmEdicao, status: e.target.value as any })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    value={planoEmEdicao.ordem ?? 0}
                    onChange={(e) =>
                      setPlanoEmEdicao({ ...planoEmEdicao, ordem: parseInt(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Lista de Recursos */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recursos do Plano
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex.: Projetos de Móveis Planejados ilimitados"
                    value={recursoInput}
                    onChange={(e) => setRecursoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        adicionarRecurso();
                      }
                    }}
                    className="flex-1 rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={adicionarRecurso}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                  {(planoEmEdicao.recursos || []).map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-700 border border-slate-200/60"
                    >
                      <span>{rec}</span>
                      <button
                        type="button"
                        onClick={() => removerRecurso(idx)}
                        className="text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 cursor-pointer"
                >
                  {salvando ? 'Salvando...' : 'Salvar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

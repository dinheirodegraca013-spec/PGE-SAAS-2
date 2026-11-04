import React, { useState, useEffect } from "react";
import {
  Link as LinkIcon,
  Plus,
  ExternalLink,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { adminService } from "@/services/admin/admin.service";
import { SaaSPlanoLink, SaaSPlano } from "@/types/admin";

export default function FinanceiroLinksView() {
  const [links, setLinks] = useState<SaaSPlanoLink[]>([]);
  const [planos, setPlanos] = useState<SaaSPlano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Modal Novo / Editar Link
  const [modalAberto, setModalAberto] = useState(false);
  const [linkEmEdicao, setLinkEmEdicao] = useState<Partial<SaaSPlanoLink>>({
    planoId: "",
    provedor: "MercadoPago",
    urlCheckout: "",
    periodicidade: "mensal",
    status: "ativo",
    observacoes: "",
  });
  const [salvando, setSalvando] = useState(false);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [resLinks, resPlanos] = await Promise.all([
        adminService.listarLinksPagamento(),
        adminService.listarPlanos(),
      ]);

      if (resLinks.succeeded && resLinks.value) {
        setLinks(resLinks.value);
      } else {
        setErro(resLinks.errors.join(" "));
      }

      if (resPlanos.succeeded && resPlanos.value) {
        const planosLista = resPlanos.value;
        setPlanos(planosLista);
        if (planosLista.length > 0 && !linkEmEdicao.planoId) {
          setLinkEmEdicao((prev) => ({ ...prev, planoId: planosLista[0].id }));
        }
      }
    } catch {
      setErro("Erro ao listar links de pagamento.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleSalvarLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !linkEmEdicao.urlCheckout ||
      !linkEmEdicao.urlCheckout.startsWith("https://")
    ) {
      alert(
        "A URL de checkout deve ser segura e começar obrigatoriamente com https://",
      );
      return;
    }

    setSalvando(true);
    try {
      const res = await adminService.salvarLinkPagamento(linkEmEdicao);
      if (res.succeeded) {
        setModalAberto(false);
        setLinkEmEdicao({
          planoId: planos[0]?.id || "",
          provedor: "MercadoPago",
          urlCheckout: "",
          periodicidade: "mensal",
          status: "ativo",
          observacoes: "",
        });
        await carregarDados();
      } else {
        alert(res.errors.join(" "));
      }
    } catch {
      alert("Erro ao salvar link de pagamento.");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirLink = async (id: string) => {
    if (!confirm("Deseja realmente excluir este link de pagamento?")) return;
    try {
      const res = await adminService.excluirLinkPagamento(id);
      if (res.succeeded) {
        await carregarDados();
      } else {
        alert(res.errors.join(" "));
      }
    } catch {
      alert("Erro ao excluir link.");
    }
  };

  const copiarUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Link de checkout copiado para a área de transferência!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Links de Pagamento por Plano
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre os links externos de checkout para cada plano (Mercado
            Pago, InfinitePay ou Checkout manual).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLinkEmEdicao({
              planoId: planos[0]?.id || "",
              provedor: "MercadoPago",
              urlCheckout: "",
              periodicidade: "mensal",
              status: "ativo",
              observacoes: "",
            });
            setModalAberto(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Link de Checkout
        </button>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {erro}
        </div>
      )}

      {/* Regra de Protocolo Seguro */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>
          Apenas URLs com criptografia <strong>HTTPS</strong> são aceitas para
          redirecionamento seguro dos clientes.
        </span>
      </div>

      {/* Tabela de Links */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {carregando ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Carregando links de pagamento...
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Nenhum link de pagamento cadastrado ainda. Clique em "Novo Link de
            Checkout".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Plano Associado</th>
                  <th className="px-5 py-3.5">Provedor Gateway</th>
                  <th className="px-5 py-3.5">URL de Checkout</th>
                  <th className="px-5 py-3.5">Periodicidade</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {links.map((link) => (
                  <tr
                    key={link.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {link.planoNome}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {link.provedor}
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {link.urlCheckout}
                    </td>
                    <td className="px-5 py-4 uppercase text-slate-500 font-mono text-[11px]">
                      {link.periodicidade}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          link.status === "ativo"
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        {link.status === "ativo" ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {link.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => copiarUrl(link.urlCheckout)}
                          className="rounded p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          title="Copiar URL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={link.urlCheckout}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded p-1 text-slate-400 hover:text-brand-600 transition"
                          title="Testar Link Externo"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleExcluirLink(link.id)}
                          className="rounded p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Adicionar / Editar Link */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Cadastrar Link de Checkout
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Vincule um link de cobrança oficial gerado no Mercado Pago,
              InfinitePay ou provedor customizado.
            </p>

            <form onSubmit={handleSalvarLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plano Comercial *
                </label>
                <select
                  required
                  value={linkEmEdicao.planoId}
                  onChange={(e) =>
                    setLinkEmEdicao({
                      ...linkEmEdicao,
                      planoId: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                >
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (R${" "}
                      {p.preco.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      / {p.periodicidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Provedor de Pagamento *
                </label>
                <select
                  value={linkEmEdicao.provedor}
                  onChange={(e) =>
                    setLinkEmEdicao({
                      ...linkEmEdicao,
                      provedor: e.target.value as any,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                >
                  <option value="MercadoPago">
                    Mercado Pago (Checkout Pro / Link)
                  </option>
                  <option value="InfinitePay">
                    InfinitePay (Link Inteligente / PIX)
                  </option>
                  <option value="Manual">Pagamento Manual / Chave PIX</option>
                  <option value="Outro">Outro Provedor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL de Checkout (HTTPS obrigatório) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=..."
                  value={linkEmEdicao.urlCheckout}
                  onChange={(e) =>
                    setLinkEmEdicao({
                      ...linkEmEdicao,
                      urlCheckout: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Periodicidade
                  </label>
                  <select
                    value={linkEmEdicao.periodicidade}
                    onChange={(e) =>
                      setLinkEmEdicao({
                        ...linkEmEdicao,
                        periodicidade: e.target.value,
                      })
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
                    Status
                  </label>
                  <select
                    value={linkEmEdicao.status}
                    onChange={(e) =>
                      setLinkEmEdicao({
                        ...linkEmEdicao,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
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
                  {salvando ? "Salvando..." : "Salvar Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


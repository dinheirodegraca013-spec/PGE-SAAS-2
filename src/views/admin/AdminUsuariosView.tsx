import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Lock,
} from 'lucide-react';
import { adminService } from '@/services/admin/admin.service';
import { SaaSUsuarioInterno, SaaSPapelInterno } from '@/types/admin';

export default function AdminUsuariosView() {
  const [usuarios, setUsuarios] = useState<SaaSUsuarioInterno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Formulário para conceder novo acesso
  const [modalAberto, setModalAberto] = useState(false);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<SaaSPapelInterno>('SaaSFinanceiro');
  const [salvando, setSalvando] = useState(false);

  const handleExcluir = async (user: SaaSUsuarioInterno) => {
    if (!window.confirm(`Excluir o acesso interno de ${user.email}? Essa ação não pode ser desfeita.`)) return;
    const res = await adminService.excluirUsuarioInterno(user.id);
    if (!res.succeeded) { alert(res.errors.join(' ')); return; }
    await carregarUsuarios();
  };

  const carregarUsuarios = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await adminService.listarUsuariosInternos();
      if (res.succeeded && res.value) {
        setUsuarios(res.value);
      } else {
        setErro(res.errors.join(' '));
      }
    } catch {
      setErro('Erro ao carregar lista de usuários internos.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleConcederAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nome.trim()) {
      alert('Preencha o nome e o e-mail do colaborador.');
      return;
    }

    setSalvando(true);
    try {
      const res = await adminService.salvarUsuarioInterno({
        email: email.trim(),
        nome: nome.trim(),
        papel,
        ativo: true,
      });

      if (res.succeeded) {
        setModalAberto(false);
        setEmail('');
        setNome('');
        await carregarUsuarios();
      } else {
        alert(res.errors.join(' '));
      }
    } catch {
      alert('Falha ao conceder acesso interno.');
    } finally {
      setSalvando(false);
    }
  };

  const handleDesativar = async (id: string, emailUser: string) => {
    if (!confirm(`Deseja revogar o acesso interno de "${emailUser}"? O usuário perderá permissão imediatamente.`)) {
      return;
    }

    try {
      const res = await adminService.desativarUsuarioInterno(id);
      if (res.succeeded) {
        await carregarUsuarios();
      } else {
        alert(res.errors.join(' '));
      }
    } catch {
      alert('Erro ao revogar acesso.');
    }
  };

  const formatarData = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Equipe Interna & Permissões do SaaS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle de acesso rigoroso separado dos clientes das marcenarias. Apenas usuários autorizados aqui acessam os painéis de administração e financeiro.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Conceder Acesso Interno
        </button>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {erro}
        </div>
      )}

      {/* Regras e Aviso de Segurança */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-900 flex items-start gap-3">
        <Lock className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Isolamento Rigoroso de Papéis</p>
          <p className="text-indigo-700/80 leading-relaxed">
            Usuários de marcenarias parceiras não podem ter privilégios administrativos no SaaS.
            Cada papel concede apenas os módulos estritamente necessários:
            <strong> SuperAdmin</strong> (administração global, planos, equipe e financeiro),
            <strong> SaaSFinanceiro</strong> (cobranças, conciliações, pagamentos manuais e relatórios), e
            <strong> SaaSConsulta</strong> (leitura de relatórios autorizados).
          </p>
        </div>
      </div>

      {/* Tabela de Usuários Internos */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {carregando ? (
          <div className="p-12 text-center text-xs text-slate-400">Carregando equipe interna...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Nome / Colaborador</th>
                  <th className="px-5 py-3.5">E-mail</th>
                  <th className="px-5 py-3.5">Papel Concedido</th>
                  <th className="px-5 py-3.5">Permissões Específicas</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Data Concessão</th>
                  <th className="px-5 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {usuarios.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">{user.nome}</td>
                    <td className="px-5 py-4 text-slate-600 font-mono">{user.email}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          user.papel === 'SuperAdmin'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200/50'
                            : user.papel === 'SaaSFinanceiro'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Shield className="h-3 w-3" />
                        {user.papel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <div className="flex gap-1.5 flex-wrap">
                        {user.permissoes.acessoAdmin && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                            Admin
                          </span>
                        )}
                        {user.permissoes.acessoFinanceiro && (
                          <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-700">
                            Financeiro
                          </span>
                        )}
                        {user.permissoes.leituraApenas && (
                          <span className="bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-700">
                            Somente Leitura
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          user.ativo ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {user.ativo ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {user.ativo ? 'Acesso Ativo' : 'Revogado'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatarData(user.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      {user.ativo ? (
                        <button
                          type="button"
                          onClick={() => handleDesativar(user.id, user.email)}
                          className="rounded px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          Revogar Acesso
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Revogado</span>
                      )}
                      <button type="button" title="Excluir acesso" aria-label="Excluir acesso" onClick={() => handleExcluir(user)} className="ml-2 inline-flex items-center justify-center rounded p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Conceder Acesso */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Conceder Acesso Interno ao SaaS</h3>
            <p className="text-xs text-slate-500 mb-4">
              Informe o e-mail de um membro confiável da equipe para liberar acesso às áreas administrativas.
            </p>

            <form onSubmit={handleConcederAcesso} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Mariana Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail do Colaborador *
                </label>
                <input
                  type="email"
                  required
                  placeholder="colaborador@pge.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Papel Interno Atribuído *
                </label>
                <select
                  value={papel}
                  onChange={(e) => setPapel(e.target.value as SaaSPapelInterno)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-hidden"
                >
                  <option value="SaaSFinanceiro">SaaSFinanceiro — Acesso a cobranças, pagamentos e relatórios</option>
                  <option value="SuperAdmin">SuperAdmin — Acesso global irrestrito a toda a plataforma</option>
                  <option value="SaaSConsulta">SaaSConsulta — Acesso de leitura para auditoria e relatórios</option>
                </select>
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
                  {salvando ? 'Salvando...' : 'Conceder Permissão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

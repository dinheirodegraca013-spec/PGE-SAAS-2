import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Phone, Mail, Search, AlertCircle, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import EmptyState from '@/components/shared/EmptyState';
import { clientesService } from '../services/clientes.service';
import type { Cliente, ClienteCreateInput } from '../types/cliente';

export default function ClientesListView() {
  const auth = useAuthStore();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const isPlanoFree = auth.usuario?.plano === 'Free';
  const limiteAtingido = isPlanoFree && clientes.length >= 10;
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  // Formulário
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClienteCreateInput>({
    nome: '',
    cpfCnpj: '',
    telefoneWhatsApp: '',
    email: '',
    observacoes: '',
  });

  const carregarClientes = async () => {
    setCarregandoLista(true);
    setErroLista(null);
    try {
      const resultado = await clientesService.listar();
      if (resultado.succeeded && resultado.value) {
        setClientes(resultado.value);
      } else {
        setErroLista(resultado.errors.join(' ') || 'Não foi possível carregar os clientes.');
      }
    } catch {
      setErroLista('Não foi possível conectar à API.');
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setErroFormulario('Informe o nome do cliente.');
      return;
    }

    if (limiteAtingido) {
      setErroFormulario('Limite atingido: O plano Free permite até 10 clientes cadastrados. Conheça outros planos para cadastrar clientes ilimitados.');
      return;
    }

    setErroFormulario(null);
    setEnviando(true);
    try {
      const resultado = await clientesService.criar({
        nome: formData.nome.trim(),
        cpfCnpj: formData.cpfCnpj?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        telefoneWhatsApp: formData.telefoneWhatsApp?.trim() || undefined,
        observacoes: formData.observacoes?.trim() || undefined,
      });

      if (!resultado.succeeded) {
        setErroFormulario(resultado.errors.join(' ') || 'Não foi possível cadastrar o cliente.');
        return;
      }

      setFormData({ nome: '', cpfCnpj: '', telefoneWhatsApp: '', email: '', observacoes: '' });
      setMostrarFormulario(false);
      await carregarClientes();
    } catch {
      setErroFormulario('Erro ao conectar ao servidor.');
    } finally {
      setEnviando(false);
    }
  };

  const formatarData = (iso: string) => {
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.telefoneWhatsApp && c.telefoneWhatsApp.includes(busca)) ||
      (c.email && c.email.toLowerCase().includes(busca.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Alerta de Limite do Plano Free */}
      {isPlanoFree && (
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border ${
          limiteAtingido ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-700'
        } shadow-xs`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${limiteAtingido ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Plano Free: {clientes.length} de 10 clientes cadastrados
              </p>
              <p className="text-xs text-slate-500">
                {limiteAtingido
                  ? 'Você atingiu o limite de clientes do plano gratuito. Nenhum dado foi excluído.'
                  : 'Seu plano gratuito permite cadastrar até 10 clientes.'}
              </p>
            </div>
          </div>
          <Link
            to="/configuracoes?tab=assinatura"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition self-start sm:self-auto"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Conhecer Outros Planos
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Clientes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cadastro de clientes, compartilhado entre todos os módulos do ERP.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary gap-2 self-start sm:self-auto cursor-pointer"
          onClick={() => {
            if (limiteAtingido && !mostrarFormulario) {
              setErroFormulario('Limite de 10 clientes do Plano Free atingido. Para cadastrar novos clientes, mude para o plano Standard ou Empresarial.');
            }
            setMostrarFormulario(!mostrarFormulario);
          }}
        >
          <Plus className="h-4 w-4" />
          {mostrarFormulario ? 'Cancelar' : 'Novo cliente'}
        </button>
      </div>

      {/* Formulário de cadastro */}
      {mostrarFormulario && (
        <form className="card space-y-4 p-6 border-brand-200 bg-brand-50/20" onSubmit={handleSubmit} noValidate>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">Cadastrar Novo Cliente</h3>
            <span className="text-xs text-slate-500">* Campos obrigatórios</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="nome" className="label-field">
                Nome completo *
              </label>
              <input
                id="nome"
                type="text"
                placeholder="Ex.: João Carlos da Silva"
                className="input-field"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="cpfCnpj" className="label-field">
                CPF / CNPJ
              </label>
              <input
                id="cpfCnpj"
                type="text"
                placeholder="000.000.000-00"
                className="input-field"
                value={formData.cpfCnpj}
                onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="telefoneWhatsApp" className="label-field">
                Telefone / WhatsApp
              </label>
              <input
                id="telefoneWhatsApp"
                type="text"
                placeholder="+55 11 99999-8888"
                className="input-field"
                value={formData.telefoneWhatsApp}
                onChange={(e) => setFormData({ ...formData, telefoneWhatsApp: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="email" className="label-field">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="cliente@email.com"
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="observacoes" className="label-field">
                Observações
              </label>
              <input
                id="observacoes"
                type="text"
                placeholder="Notas sobre preferências, endereço..."
                className="input-field"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>
          </div>

          {erroFormulario && <p className="text-sm text-red-600">{erroFormulario}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMostrarFormulario(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={enviando}>
              {enviando ? 'Salvando...' : 'Salvar cliente'}
            </button>
          </div>
        </form>
      )}

      {/* Barra de pesquisa */}
      {!carregandoLista && clientes.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="input-field pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      )}

      {/* Listagem */}
      {carregandoLista ? (
        <div className="card p-8 text-center text-sm text-slate-500">Carregando clientes...</div>
      ) : erroLista || clientes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado ainda"
          description={erroLista ?? 'Clique em "Novo cliente" para cadastrar o primeiro.'}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nome
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contato
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Origem
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Cadastrado em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">
                      Nenhum cliente corresponde à pesquisa "{busca}".
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-slate-900">{cliente.nome}</div>
                        {cliente.cpfCnpj && (
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{cliente.cpfCnpj}</div>
                        )}
                        {cliente.observacoes && (
                          <div className="text-xs text-slate-500 italic mt-0.5 max-w-md truncate">
                            {cliente.observacoes}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-600">
                          {cliente.telefoneWhatsApp ? (
                            <span className="flex items-center gap-1.5 font-medium text-slate-800">
                              <Phone className="h-3.5 w-3.5 text-emerald-600" />
                              {cliente.telefoneWhatsApp}
                            </span>
                          ) : null}
                          {cliente.email ? (
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              {cliente.email}
                            </span>
                          ) : null}
                          {!cliente.telefoneWhatsApp && !cliente.email && '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            cliente.origem === 'WhatsApp'
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cliente.origem}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatarData(cliente.createdAtUtc)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

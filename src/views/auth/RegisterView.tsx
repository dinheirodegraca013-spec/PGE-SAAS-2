import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { planos } from './planos';
import { TenantPlano } from '@/types/api';

export default function RegisterView() {
  const navigate = useNavigate();
  const auth = useAuthStore();

  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [plano, setPlano] = useState<number>(TenantPlano.Standard);

  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [estaEnviando, setEstaEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim()) {
      setErroServidor('Informe o nome ou razão social da sua empresa.');
      return;
    }
    if (!nomeCompleto.trim()) {
      setErroServidor('Informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      setErroServidor('Informe seu e-mail.');
      return;
    }
    if (senha.length < 6) {
      setErroServidor('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErroServidor('As senhas não coincidem.');
      return;
    }

    setErroServidor(null);
    setEstaEnviando(true);
    try {
      const resultado = await auth.register({
        razaoSocial: razaoSocial.trim(),
        nomeFantasia: nomeFantasia.trim() || undefined,
        nomeCompleto: nomeCompleto.trim(),
        email: email.trim(),
        senha,
        plano,
      });

      if (!resultado.succeeded) {
        setErroServidor(resultado.errors.join(' ') || 'Não foi possível criar a conta.');
        return;
      }

      navigate('/');
    } finally {
      setEstaEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white font-bold text-xl shadow-md mb-4">
            E
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Crie sua conta</h1>
          <p className="mt-1 text-sm text-slate-500">Comece a usar o ERP SaaS na sua marcenaria</p>
        </div>

        <form className="card space-y-6 p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
          {/* Dados da empresa */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              1. Sua empresa
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="razaoSocial" className="label-field">
                  Razão social *
                </label>
                <input
                  id="razaoSocial"
                  type="text"
                  placeholder="Ex.: Marcenaria Arte & Design Ltda"
                  className="input-field"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="nomeFantasia" className="label-field">
                  Nome fantasia (opcional)
                </label>
                <input
                  id="nomeFantasia"
                  type="text"
                  placeholder="Ex.: Arte & Design Móveis"
                  className="input-field"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Dados do usuário */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              2. Sua conta de administrador
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="nomeCompleto" className="label-field">
                  Nome completo *
                </label>
                <input
                  id="nomeCompleto"
                  type="text"
                  placeholder="Ex.: Carlos Eduardo Oliveira"
                  className="input-field"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="email" className="label-field">
                  E-mail de acesso *
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="carlos@marcenaria.com.br"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="senha" className="label-field">
                  Senha *
                </label>
                <input
                  id="senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="input-field"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmarSenha" className="label-field">
                  Confirmar senha *
                </label>
                <input
                  id="confirmarSenha"
                  type="password"
                  placeholder="Repita sua senha"
                  className="input-field"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Seleção de plano */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              3. Escolha seu plano de assinatura
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {planos.map((def) => {
                const isSelected = plano === def.valor;
                return (
                  <label
                    key={def.valor}
                    className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-600 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plano"
                      value={def.valor}
                      checked={isSelected}
                      onChange={() => setPlano(def.valor)}
                      className="sr-only"
                    />
                    {def.destaque && (
                      <span className="absolute -top-2.5 right-3 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        Mais popular
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-900">{def.nome}</span>
                    <span className="mt-1 text-lg font-extrabold text-slate-900">{def.precoMensal}</span>
                    <span className="mt-1 text-xs text-slate-500">{def.descricao}</span>
                    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                      {def.recursos.map((recurso) => (
                        <li key={recurso} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-brand-600" />
                          <span>{recurso}</span>
                        </li>
                      ))}
                    </ul>
                  </label>
                );
              })}
            </div>
          </div>

          {erroServidor && <p className="text-xs text-red-600 font-medium">{erroServidor}</p>}

          <button type="submit" className="btn-primary w-full cursor-pointer py-3 text-base" disabled={estaEnviando}>
            {estaEnviando ? 'Criando conta...' : 'Criar conta e entrar no ERP'}
          </button>
          <p className="text-center text-xs text-slate-400">
            Nenhuma cobrança é realizada neste ambiente de demonstração e homologação.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

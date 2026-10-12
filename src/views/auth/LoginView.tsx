import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

export default function LoginView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuthStore();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [estaEnviando, setEstaEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha.trim()) {
      setErroServidor('Informe seu e-mail e senha.');
      return;
    }

    setErroServidor(null);
    setEstaEnviando(true);
    try {
      const resultado = await auth.login(email.trim(), senha);
      if (!resultado.succeeded) {
        setErroServidor(resultado.errors.join(' '));
        return;
      }
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect);
    } finally {
      setEstaEnviando(false);
    }
  };

  const handleDemoLogin = () => {
    auth.loginAsDemo();
    const redirect = searchParams.get('redirect') || '/';
    navigate(redirect);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white font-bold text-xl shadow-md mb-4">
            E
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ERP SaaS</h1>
          <p className="mt-1 text-sm text-slate-500">Gestão para marcenarias e prestadores de serviços</p>
        </div>

        <form className="card space-y-4 p-6 shadow-sm" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="label-field">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com.br"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="senha" className="label-field">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="input-field"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          {erroServidor && <p className="text-xs text-red-600 font-medium">{erroServidor}</p>}

          <button type="submit" className="btn-primary w-full cursor-pointer" disabled={estaEnviando}>
            {estaEnviando ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">ou acesso rápido</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary w-full gap-2 text-xs border-brand-200 text-brand-700 bg-brand-50/50 hover:bg-brand-50"
            onClick={handleDemoLogin}
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            Entrar como Administrador (Demonstração)
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Ainda não tem uma conta?{' '}
          <Link to="/cadastro" className="font-semibold text-brand-600 hover:text-brand-700">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

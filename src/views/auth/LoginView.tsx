import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

export default function LoginView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuthStore();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [estaEnviando, setEstaEnviando] = useState(false);

  // Recuperação de senha
  const [modoRecuperacao, setModoRecuperacao] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [sucessoRecuperacao, setSucessoRecuperacao] = useState(false);
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);

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

  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecuperacao.trim()) {
      setErroServidor('Informe seu e-mail para recuperação.');
      return;
    }
    setErroServidor(null);
    setEnviandoRecuperacao(true);
    try {
      const res = await auth.recuperarSenha(emailRecuperacao.trim());
      if (res.succeeded) {
        setSucessoRecuperacao(true);
      } else {
        setErroServidor(res.errors.join(' '));
      }
    } finally {
      setEnviandoRecuperacao(false);
    }
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

        {modoRecuperacao ? (
          <div className="card space-y-4 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700 p-1"
                onClick={() => {
                  setModoRecuperacao(false);
                  setSucessoRecuperacao(false);
                  setErroServidor(null);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-bold text-slate-900">Recuperar Senha</h2>
            </div>

            {sucessoRecuperacao ? (
              <div className="space-y-3 py-2 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="text-sm font-medium text-slate-900">E-mail de recuperação enviado!</p>
                <p className="text-xs text-slate-500">
                  Verifique sua caixa de entrada e clique no link recebido para redefinir sua senha.
                </p>
                <button
                  type="button"
                  className="btn-primary w-full text-xs mt-2"
                  onClick={() => {
                    setModoRecuperacao(false);
                    setSucessoRecuperacao(false);
                  }}
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecuperarSenha} className="space-y-4">
                <p className="text-xs text-slate-500">
                  Informe o e-mail cadastrado na sua conta para receber as instruções de redefinição de senha do Supabase.
                </p>
                <div>
                  <label htmlFor="emailRecup" className="label-field text-xs">
                    E-mail
                  </label>
                  <input
                    id="emailRecup"
                    type="email"
                    placeholder="seu@email.com"
                    className="input-field text-xs"
                    value={emailRecuperacao}
                    onChange={(e) => setEmailRecuperacao(e.target.value)}
                    required
                  />
                </div>
                {erroServidor && <p className="text-xs text-red-600 font-medium">{erroServidor}</p>}
                <button type="submit" className="btn-primary w-full text-xs" disabled={enviandoRecuperacao}>
                  {enviandoRecuperacao ? 'Enviando link...' : 'Enviar Link de Redefinição'}
                </button>
              </form>
            )}
          </div>
        ) : (
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
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="senha" className="label-field mb-0">
                  Senha
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
                  onClick={() => {
                    setModoRecuperacao(true);
                    setEmailRecuperacao(email);
                    setErroServidor(null);
                  }}
                >
                  Esqueceu a senha?
                </button>
              </div>
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
          </form>
        )}

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

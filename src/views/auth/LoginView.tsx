import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles, CheckCircle2, ArrowLeft, ShieldCheck, Zap, Clock3 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

import { GestioLogo } from '@/components/brand/GestioBrand';

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
    <main className="min-h-screen bg-[#080D1B] text-slate-900 lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="pointer-events-none absolute inset-0" style={{background:'radial-gradient(ellipse at 18% 20%, rgba(6,182,212,.20), transparent 38%), radial-gradient(ellipse at 80% 85%, rgba(124,58,237,.25), transparent 42%)'}} />
        <div className="relative"><Link to="/"><GestioLogo variant="dark" size="lg" withTagline={true} /></Link></div>
        <div className="relative max-w-xl py-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-200"><Sparkles className="h-4 w-4" /> Sua gestão, em um só lugar</div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight xl:text-6xl">Bom ter você de volta à <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">Gestio.</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Entre para acompanhar seus clientes, projetos, serviços e oportunidades com mais organização.</p>
          <div className="mt-9 space-y-4 text-sm text-slate-300">
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-cyan-300" /> Acesso protegido à sua conta</div>
            <div className="flex items-center gap-3"><Zap className="h-5 w-5 text-cyan-300" /> Informações da sua operação reunidas</div>
            <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-cyan-300" /> Mais praticidade para sua rotina</div>
          </div>
        </div>
        <p className="relative text-xs text-slate-500">GESTIO — Gestão inteligente para quem faz acontecer.</p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-8 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden"><Link to="/" className="inline-flex justify-center"><GestioLogo variant="light" size="lg" withTagline={true} /></Link></div>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
            <div className="mb-7">
              <p className="text-sm font-semibold text-cyan-700">ÁREA DO CLIENTE</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{modoRecuperacao ? 'Recuperar senha' : 'Acesse sua conta'}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{modoRecuperacao ? 'Vamos ajudar você a recuperar o acesso.' : 'Informe seus dados para continuar no Gestio.'}</p>
            </div>
            {searchParams.get('confirmacao') === 'sucesso' && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                <p className="font-semibold">E-mail confirmado!</p><p className="mt-1">Sua confirmação foi recebida. Entre com seu e-mail e senha para continuar.</p>
              </div>
            )}
            {modoRecuperacao ? (
              <div className="space-y-4">
                <button type="button" className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900" onClick={() => { setModoRecuperacao(false); setSucessoRecuperacao(false); setErroServidor(null); }}><ArrowLeft className="h-4 w-4" /> Voltar ao login</button>
                {sucessoRecuperacao ? (
                  <div className="space-y-3 rounded-2xl bg-emerald-50 p-5 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /><p className="font-semibold text-emerald-900">E-mail de recuperação enviado!</p><p className="text-sm leading-6 text-emerald-800">Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p></div>
                ) : (
                  <form onSubmit={handleRecuperarSenha} className="space-y-4">
                    <div><label htmlFor="emailRecup" className="label-field">E-mail cadastrado</label><input id="emailRecup" type="email" placeholder="voce@empresa.com.br" className="input-field" value={emailRecuperacao} onChange={(e) => setEmailRecuperacao(e.target.value)} required /></div>
                    {erroServidor && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erroServidor}</p>}
                    <button type="submit" className="btn-primary w-full py-3" disabled={enviandoRecuperacao}>{enviandoRecuperacao ? 'Enviando...' : 'Enviar instruções'} <ArrowRight className="ml-2 h-4 w-4" /></button>
                  </form>
                )}
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div><label htmlFor="email" className="label-field">E-mail</label><input id="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" className="input-field py-3" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><div className="mb-1.5 flex items-center justify-between gap-3"><label htmlFor="senha" className="label-field mb-0">Senha</label><button type="button" className="text-xs font-semibold text-cyan-700 transition hover:text-violet-700" onClick={() => { setModoRecuperacao(true); setEmailRecuperacao(email); setErroServidor(null); }}>Esqueceu a senha?</button></div><input id="senha" type="password" autoComplete="current-password" placeholder="Digite sua senha" className="input-field py-3" value={senha} onChange={(e) => setSenha(e.target.value)} required /></div>
                {erroServidor && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{erroServidor}</p>}
                <button type="submit" className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-900/15 transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" disabled={estaEnviando}>{estaEnviando ? 'Entrando...' : 'Entrar no Gestio'} {!estaEnviando && <ArrowRight className="ml-2 h-4 w-4" />}</button>
                <p className="text-center text-xs text-slate-500">Ao continuar, você acessará somente os recursos liberados para sua conta.</p>
              </form>
            )}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">Ainda não tem uma conta? <Link to="/cadastro" className="font-semibold text-cyan-700 hover:text-violet-700">Conheça os planos e cadastre-se</Link></p>
          <p className="mt-8 text-center text-xs text-slate-400">© {new Date().getFullYear()} Gestio · Gestão inteligente para quem faz acontecer</p>
        </div>
      </section>
    </main>
  );
}

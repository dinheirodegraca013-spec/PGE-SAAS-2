import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ResetPasswordView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reenviandoLink, setReenviandoLink] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [sessaoValidada, setSessaoValidada] = useState(false);
  const [verificandoLink, setVerificandoLink] = useState(true);

  useEffect(() => {
    let mounted = true;
    const limparTokensDaUrl = () => {
      if (window.location.hash || window.location.search.includes('code=')) {
        window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search.replace(/([?&])code=[^&]*/i, '').replace(/[?&]$/, '')}`);
      }
    };
    const prepararSessaoDeRecuperacao = async () => {
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        limparTokensDaUrl();
        return;
      }
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
        limparTokensDaUrl();
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSessaoValidada(Boolean(session));
      if (session?.user.email) setEmail(session.user.email);
    });
    // Aceita os formatos atuais do Supabase (PKCE `code` e tokens no hash), além da sessão persistida.
    prepararSessaoDeRecuperacao().then(() => supabase.auth.getSession()).then(({ data, error }) => {
      if (!mounted) return;
      setSessaoValidada(!error && Boolean(data.session));
      if (data.session?.user.email) setEmail(data.session.user.email);
      if (error) setErro('Não foi possível validar o link. Abra o e-mail mais recente ou solicite outro acesso.');
    }).catch(() => {
      if (mounted) setErro('Não foi possível validar o link. Confira sua conexão e abra o link novamente.');
    }).finally(() => {
      if (mounted) setVerificandoLink(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    setMensagem(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = codigo.trim().replace(/\s/g, '');
    if (!sessaoValidada && !normalizedEmail) {
      setErro('Informe o e-mail que recebeu o código.');
      return;
    }
    if (!sessaoValidada && !normalizedCode) {
      setErro('Informe o código recebido por e-mail.');
      return;
    }
    if (senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (new TextEncoder().encode(senha).length > 72) {
      setErro('A senha deve ter no máximo 72 bytes. Acentos e símbolos podem ocupar mais de um byte.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setEnviando(true);
    try {
      if (!sessaoValidada) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: normalizedCode,
          type: 'recovery',
        });
        if (verifyError) {
          setErro('Código inválido ou expirado. Confira o e-mail mais recente ou solicite um novo acesso.');
          return;
        }
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setSessaoValidada(false);
        setErro('O acesso expirou. Abra o link do e-mail mais recente ou solicite um novo acesso.');
        return;
      }
      setSessaoValidada(true);

      const { error: updateError } = await supabase.auth.updateUser({ password: senha });
      if (updateError) {
        setErro(updateError.message || 'Não foi possível atualizar a senha.');
        return;
      }

      setSucesso(true);
      await supabase.auth.signOut();
      window.setTimeout(() => navigate('/login?senha=atualizada', { replace: true }), 1500);
    } catch (err: any) {
      setErro(err?.message || 'Ocorreu um erro ao atualizar a senha.');
    } finally {
      setEnviando(false);
    }
  };

  const handleReenviarLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErro('Informe o e-mail da conta para receber um novo link.');
      return;
    }
    setErro(null);
    setMensagem(null);
    setReenviandoLink(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      setCodigo('');
      setMensagem('Novo link enviado. Abra o e-mail mais recente para continuar.');
    } catch (cause: any) {
      setErro(cause?.message || 'Não foi possível reenviar o link agora.');
    } finally {
      setReenviandoLink(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Redefinir senha</h1>
          <p className="mt-1 text-sm text-slate-500">{verificandoLink ? 'Validando seu link de acesso...' : sessaoValidada ? 'Acesso confirmado. Crie sua nova senha.' : 'Abra o link do e-mail mais recente para criar sua senha.'}</p>
        </div>

        <div className="card space-y-4 p-6 shadow-sm">
          {sucesso ? (
            <div className="space-y-3 py-3 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-semibold text-slate-900">Senha alterada com sucesso!</p>
              <p className="text-sm text-slate-500">Você será redirecionado para entrar com a nova senha.</p>
            </div>
          ) : verificandoLink ? (
            <p role="status" className="text-sm text-slate-500">Aguarde a validação do link.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!sessaoValidada && <>
              <p className="text-sm text-slate-500">Se seu e-mail contém um código, você também pode informá-lo abaixo.</p>
              <div>
                <label htmlFor="emailRecuperacao" className="label-field">E-mail da conta</label>
                <input
                  id="emailRecuperacao"
                  type="email"
                  autoComplete="email"
                  className="input-field"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="codigoRecuperacao" className="label-field">Código recebido por e-mail</label>
                <input
                  id="codigoRecuperacao"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="input-field"
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value)}
                  placeholder="Digite o código"
                  required
                />
              </div>
              <button type="button" className="text-xs font-semibold text-cyan-700 hover:text-violet-700 disabled:opacity-50" onClick={handleReenviarLink} disabled={reenviandoLink}>
                {reenviandoLink ? 'Enviando novo link...' : 'Reenviar link de redefinição'}
              </button>
              </>}
              <div>
                <label htmlFor="novaSenha" className="label-field">Nova senha</label>
                <input
                  id="novaSenha"
                  type="password"
                  autoComplete="new-password"
                  className="input-field"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmarSenha" className="label-field">Confirmar nova senha</label>
                <input
                  id="confirmarSenha"
                  type="password"
                  autoComplete="new-password"
                  className="input-field"
                  value={confirmarSenha}
                  onChange={(event) => setConfirmarSenha(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {mensagem && <p role="status" className="text-xs font-medium text-emerald-700">{mensagem}</p>}
              {erro && <p role="alert" className="text-xs font-medium text-red-600">{erro}</p>}
              <button type="submit" className="btn-primary w-full" disabled={enviando}>
                {enviando ? 'Salvando nova senha...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
          <Link to="/login" className="flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}


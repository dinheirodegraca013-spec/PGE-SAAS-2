import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ResetPasswordView() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [validando, setValidando] = useState(true);
  const [sessaoValida, setSessaoValida] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Supabase troca o token do link de recuperação por uma sessão no navegador.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessaoValida(true);
        setErro(null);
        setValidando(false);
      }
    });

    const verificarSessao = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const params = new URLSearchParams(window.location.search);
      const linkError = params.get('error_description') || hash.get('error_description');

      if (linkError) {
        if (mounted) {
          setErro('O link de recuperação expirou ou é inválido. Solicite um novo link.');
          setValidando(false);
        }
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!sessionError && data.session) {
        setSessaoValida(true);
      } else {
        setErro('Não foi possível validar o link. Solicite uma nova recuperação de senha e abra o link mais recente recebido por e-mail.');
      }
      setValidando(false);
    };

    void verificarSessao();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setEnviando(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session || !sessaoValida) {
        setErro('Sua sessão de recuperação não é válida. Solicite um novo link.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: senha });
      if (updateError) {
        setErro(updateError.message || 'Não foi possível atualizar a senha.');
        return;
      }

      setSucesso(true);
      await supabase.auth.signOut();
      window.setTimeout(() => navigate('/login?senha=atualizada', { replace: true }), 1200);
    } catch (err: any) {
      setErro(err?.message || 'Ocorreu um erro ao atualizar a senha.');
    } finally {
      setEnviando(false);
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
          <p className="mt-1 text-sm text-slate-500">Crie uma nova senha para sua conta Gestio.</p>
        </div>

        <div className="card space-y-4 p-6 shadow-sm">
          {validando ? (
            <p className="py-4 text-center text-sm text-slate-500">Validando link de recuperação...</p>
          ) : sucesso ? (
            <div className="space-y-3 py-3 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-semibold text-slate-900">Senha alterada com sucesso!</p>
              <p className="text-sm text-slate-500">Você será redirecionado para entrar com a nova senha.</p>
            </div>
          ) : !sessaoValida ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600">{erro || 'Link de recuperação inválido.'}</p>
              <Link to="/login" className="btn-primary flex w-full items-center justify-center gap-2 text-xs">
                <ArrowLeft className="h-4 w-4" /> Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              {erro && <p role="alert" className="text-xs font-medium text-red-600">{erro}</p>}
              <button type="submit" className="btn-primary w-full" disabled={enviando}>
                {enviando ? 'Atualizando senha...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

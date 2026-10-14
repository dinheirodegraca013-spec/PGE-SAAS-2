import React, { useState } from 'react';
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
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = codigo.trim().replace(/\s/g, '');
    if (!normalizedEmail) {
      setErro('Informe o e-mail que recebeu o código.');
      return;
    }
    if (!normalizedCode) {
      setErro('Informe o código recebido por e-mail.');
      return;
    }
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
      // Validar o código diretamente evita que verificadores de links consumam o token.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedCode,
        type: 'recovery',
      });
      if (verifyError) {
        setErro('Código inválido ou expirado. Confira o código do e-mail mais recente e tente novamente.');
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setErro('O código foi validado, mas a sessão não foi criada. Solicite um novo código.');
        return;
      }

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Redefinir senha</h1>
          <p className="mt-1 text-sm text-slate-500">Informe o código enviado por e-mail e crie uma nova senha.</p>
        </div>

        <div className="card space-y-4 p-6 shadow-sm">
          {sucesso ? (
            <div className="space-y-3 py-3 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="font-semibold text-slate-900">Senha alterada com sucesso!</p>
              <p className="text-sm text-slate-500">Você será redirecionado para entrar com a nova senha.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                {enviando ? 'Validando código...' : 'Salvar nova senha'}
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

import React from 'react';
import { Link } from 'react-router-dom';
import DeviceManager from '@/components/DeviceManager';
import { useAuthStore } from '@/stores/auth';
import { authorizeDevice } from '@/services/api/device-access';
import { supabase } from '@/lib/supabase';

export default function DevicesView() {
  const { deviceError, logout } = useAuthStore();
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [sessionState, setSessionState] = React.useState<'loading' | 'signed-in' | 'signed-out'>('loading');
  React.useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSessionState(session ? 'signed-in' : 'signed-out');
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (mounted) setSessionState(!error && data.session ? 'signed-in' : 'signed-out');
    }).catch(() => { if (mounted) setSessionState('signed-out'); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  async function authorize() {
    setBusy(true); setError('');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Entre com seu e-mail e senha antes de autorizar o dispositivo.');
      await authorizeDevice(true);
      window.location.assign('/');
    } catch (e) { setError((e as Error).message || 'Não foi possível autorizar.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-2xl space-y-5">
    <h1 className="text-2xl font-bold">Controle de dispositivos</h1>
    {(error || deviceError) && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error || deviceError}</p>}
    {sessionState === 'loading' ? <p role="status">Verificando sua sessão…</p> : sessionState === 'signed-in' ? <DeviceManager /> : <p className="rounded-xl bg-white p-5 text-sm">Entre com seu e-mail e senha para consultar e gerenciar os dispositivos da sua conta.</p>}
    <div className="flex flex-wrap gap-3">{sessionState === 'signed-in' ? <><button className="btn-primary" disabled={busy} onClick={() => void authorize()}>{busy ? 'Autorizando…' : 'Autorizar este navegador'}</button>
      <button className="btn-secondary" onClick={() => void logout().then(() => window.location.assign('/login'))}>Sair</button></> : sessionState === 'signed-out' && <Link className="btn-primary" to="/login">Entrar na minha conta</Link>}<Link className="btn-secondary" to="/">Voltar</Link></div>
    <p className="text-sm text-slate-500">O administrador da empresa pode solicitar um upgrade para ampliar os limites do plano.</p>
  </div></main>;
}

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Device = { id: string; name: string; created_at: string; last_seen_at: string; revoked_at: string | null; suspended: boolean; current: boolean };
export default function DeviceManager({ userId }: { userId?: string }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const { data, error } = await supabase.rpc('listar_dispositivos', { p_usuario_id: userId || null });
      if (error) throw error;
      setDevices(data.devices); setLimit(data.limit);
    } catch (e) { setError(e instanceof Error ? e.message : (e as {message?: string})?.message || 'Não foi possível consultar os dispositivos.'); }
    finally { setBusy(false); }
  }, [userId]);
  useEffect(() => { setDevices([]); setLimit(null); void load(); }, [load]);
  async function revoke(id: string) {
    setBusy(true); setError('');
    try {
      const { error } = await supabase.rpc('revogar_dispositivo', { p_dispositivo_id: id });
      if (error) throw error;
      await load();
    } catch (e) { setError((e as {message?: string})?.message || 'Não foi possível revogar.'); }
    finally { setBusy(false); }
  }
  const active = devices.filter(d => !d.revoked_at && !d.suspended).length;
  return <section className="card space-y-3 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Dispositivos autorizados</h2><button className="btn-secondary" disabled={busy} onClick={() => void load()}>Atualizar</button></div>
    {limit !== null && <p className="text-sm text-slate-500">{active} de {limit} utilizados · {Math.max(0, limit - active)} disponíveis por login.</p>}
    <p className="text-sm text-slate-500">Revogar bloqueia as sessões vinculadas a este dispositivo.</p>
    <p className="text-xs text-slate-500">Cada navegador ou perfil conta como um dispositivo. Limpar os dados do navegador cria uma nova identificação.</p>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {!busy && !error && !devices.length && <p className="text-sm text-slate-500">Nenhum dispositivo cadastrado.</p>}
    <ul className="divide-y divide-slate-100">{devices.map(d => <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div>
      <b className="text-sm">{d.name}{d.current ? ' · Este dispositivo' : ''}</b>
      <p className="text-xs text-slate-500">{d.revoked_at ? 'Revogado' : d.suspended ? 'Suspenso pelo plano' : 'Autorizado'} · Último acesso: {new Date(d.last_seen_at).toLocaleString('pt-BR')}</p>
    </div>{!d.revoked_at && <button className="btn-secondary text-rose-700" disabled={busy} onClick={() => void revoke(d.id)}>Revogar</button>}</li>)}</ul>
  </section>;
}

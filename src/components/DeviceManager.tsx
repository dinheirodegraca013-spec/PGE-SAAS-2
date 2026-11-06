import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Device = { id: string; name: string; created_at: string; last_seen_at: string; revoked_at: string | null; suspended: boolean; current: boolean };
const isDateString=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0&&Number.isFinite(new Date(value).getTime());
const isDevice=(value:unknown):value is Device=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&typeof (value as Record<string,unknown>).id==='string'&&String((value as Record<string,unknown>).id).trim().length>0&&typeof (value as Record<string,unknown>).name==='string'&&String((value as Record<string,unknown>).name).trim().length>0&&isDateString((value as Record<string,unknown>).created_at)&&isDateString((value as Record<string,unknown>).last_seen_at)&&((value as Record<string,unknown>).revoked_at===null||isDateString((value as Record<string,unknown>).revoked_at))&&typeof (value as Record<string,unknown>).suspended==='boolean'&&typeof (value as Record<string,unknown>).current==='boolean');
const formatDeviceDate=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Data não informada':date.toLocaleString('pt-BR');};
export default function DeviceManager({ userId }: { userId?: string }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lastReturnRefresh = useRef(0);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setBusy(true); setError('');
    try {
      const { data, error } = await supabase.rpc('listar_dispositivos', { p_usuario_id: userId || null });
      if (error) throw error;
      if (!data || typeof data!=='object' || Array.isArray(data) || !Array.isArray(data.devices) || !data.devices.every(isDevice) || !Number.isSafeInteger(data.limit) || data.limit<0) throw new Error('Resposta de dispositivos inválida. Atualize a página.');
      const devices = data.devices as Device[];
      if (new Set(devices.map((device: Device) => device.id)).size !== devices.length || devices.filter((device: Device) => !device.revoked_at && !device.suspended).length > data.limit) throw new Error('Resposta de dispositivos inválida. Atualize a página.');
      if (request === generation.current) { setDevices(devices); setLimit(data.limit); }
    } catch (e) { if (request === generation.current) setError(e instanceof Error ? e.message : (e as {message?: string})?.message || 'Não foi possível consultar os dispositivos.'); }
    finally { if (request === generation.current) setBusy(false); }
  }, [userId]);
  useEffect(() => { setDevices([]); setLimit(null); void load(); }, [load]);
  useEffect(() => { const refreshOnReturn = () => { const now = Date.now(); if (document.visibilityState === 'visible' && now - lastReturnRefresh.current > 1000) { lastReturnRefresh.current = now; void load(); } }; window.addEventListener('focus', refreshOnReturn); document.addEventListener('visibilitychange', refreshOnReturn); return () => { window.removeEventListener('focus', refreshOnReturn); document.removeEventListener('visibilitychange', refreshOnReturn); }; }, [load]);
  async function revoke(id: string) {
    const request = generation.current;
    setBusy(true); setError('');
    try {
      const { error } = await supabase.rpc('revogar_dispositivo', { p_dispositivo_id: id });
      if (error) throw error;
      if (request !== generation.current) return;
      await load();
    } catch (e) { if (request === generation.current) setError((e as {message?: string})?.message || 'Não foi possível revogar.'); }
    finally { if (request === generation.current) setBusy(false); }
  }
  const active = devices.filter(d => !d.revoked_at && !d.suspended).length;
  return <section className="card space-y-3 p-5" aria-busy={busy}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Dispositivos autorizados</h2><button type="button" className="btn-secondary" disabled={busy} aria-label={busy?'Atualizando dispositivos':'Atualizar dispositivos'} onClick={() => void load()}>{busy?'Atualizando…':'Atualizar'}</button></div>
    {limit !== null && <p className="text-sm text-slate-500">{active} de {limit} utilizados · {Math.max(0, limit - active)} disponíveis por login.</p>}
    <p className="text-sm text-slate-500">Revogar bloqueia as sessões vinculadas a este dispositivo.</p>
    <p className="text-xs text-slate-500">Cada navegador ou perfil conta como um dispositivo. Limpar os dados do navegador cria uma nova identificação.</p>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {!busy && !error && !devices.length && <p className="text-sm text-slate-500">Nenhum dispositivo cadastrado.</p>}
    <ul className="divide-y divide-slate-100">{devices.map(d => <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div>
      <b className="text-sm">{d.name}{d.current ? ' · Este dispositivo' : ''}</b>
      <p className="text-xs text-slate-500">{d.revoked_at ? 'Revogado' : d.suspended ? 'Suspenso pelo plano' : 'Autorizado'} · Último acesso: {formatDeviceDate(d.last_seen_at)}</p>
    </div>{!d.revoked_at && <button type="button" className="btn-secondary text-rose-700" aria-label={`Revogar dispositivo ${d.name}`} disabled={busy} onClick={() => { if (window.confirm(`Revogar o dispositivo "${d.name}"? As sessões vinculadas serão encerradas.`)) void revoke(d.id); }}>Revogar</button>}</li>)}</ul>
  </section>;
}

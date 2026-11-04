import { supabase } from '@/lib/supabase';

const DEVICE_KEY = 'gestio:device-key';
export function deviceKey(renew = false): string {
  let key = renew ? null : localStorage.getItem(DEVICE_KEY);
  if (!key) { key = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, key); }
  return key;
}
export async function authorizeDevice(renew = false): Promise<void> {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Computador';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Navegador';
  const { data, error } = await supabase.rpc('autorizar_dispositivo', { p_chave: deviceKey(renew), p_nome: `${browser} · ${os}` });
  if (error || !data?.authorized) throw new Error(error?.message || 'Não foi possível autorizar este dispositivo.');
}

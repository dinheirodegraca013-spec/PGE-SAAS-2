import React, { useRef, useState } from 'react';
import type { MaterialOption, MaterialRequest } from '../services/technical-sheet.service';

const statusLabels: Record<MaterialRequest['status'], string> = { pendente: 'Pendente', aprovada: 'Aprovada', recusada: 'Recusada', atendida: 'Atendida', cancelada: 'Cancelada' };
const qtyFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const formatQuantity = (value: number) => Number.isFinite(value) ? qtyFormat.format(value) : 'Quantidade indisponível';
const formatStatus = (status: MaterialRequest['status']) => statusLabels[status] ?? 'Status indisponível';

export default function MaterialRequestPanel({
  options,
  requests,
  canRequest,
  disabled,
  error,
  onCreate,
  onCancel,
  onRefresh,
}: {
  options: MaterialOption[];
  requests: MaterialRequest[];
  canRequest: boolean;
  disabled: boolean;
  error?: string;
  onCreate: (input: { request: string; item: string; quantity: number; unit: string; reason: string }) => Promise<void>;
  onCancel: (request: MaterialRequest) => Promise<void>;
  onRefresh: () => void | Promise<void>;
}) {
  const fieldPrefix = React.useId();
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'status' | 'error'>('status');
  const request = useRef<{ payload: string; id: string } | null>(null);
  const selected = options.find(option => option.id === item);
  const refreshRequests = async () => {
    if (disabled || busy) return;
    setBusy(true); setMessage(''); setUpdatedAt(null);
    try { await onRefresh(); setUpdatedAt(new Date()); setMessageKind('status'); setMessage('Solicitações atualizadas.'); }
    catch (cause) { setMessageKind('error'); setMessage(cause instanceof Error ? cause.message : 'Não foi possível atualizar as solicitações.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" aria-busy={busy}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold">Solicitações ao Estoque</h4><p className="text-sm text-slate-500">Peça materiais para esta ordem e acompanhe o atendimento.</p><span className="text-xs text-slate-500" aria-live="polite">{busy?'Atualizando solicitações…':updatedAt?`Atualizadas às ${updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando atualização'}</span></div><button type="button" className="btn-secondary" onClick={refreshRequests} disabled={disabled || busy} aria-label={busy?'Atualizando solicitações':'Atualizar solicitações'}>{busy?'Atualizando…':'Atualizar'}</button></div>
    {canRequest && <form className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2" onSubmit={async event => {
      event.preventDefault(); const value = Number(quantity); const text = reason.trim();
      if (!selected || !Number.isFinite(value) || value <= 0 || value >= 100000000 || text.length < 3) { setMessageKind('error'); setMessage('Selecione o material, informe a quantidade e explique a necessidade.'); return; }
      const data = { item: selected.id, quantity: value, unit: selected.unidade, reason: text }; const payload = JSON.stringify(data);
      if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
      setBusy(true); setMessage(''); try { await onCreate({ ...data, request: request.current.id }); request.current = null; setMessageKind('status'); setMessage('Solicitação enviada.'); setItem(''); setQuantity('1'); setReason(''); } catch (cause) { setMessageKind('error'); setMessage(cause instanceof Error ? cause.message : 'Não foi possível solicitar o material.'); } finally { setBusy(false); }
    }}>
      <label htmlFor={`${fieldPrefix}-item`} className="block text-sm sm:col-span-2">Material<select id={`${fieldPrefix}-item`} className="input-field mt-1" value={item} onChange={event => { setItem(event.target.value); setMessage(''); }} disabled={disabled || busy}><option value="">Selecione um material</option>{options.map(option => <option key={option.id} value={option.id}>{option.nome} · disponível: {formatQuantity(option.saldo)} {option.unidade}</option>)}</select></label>
      <label htmlFor={`${fieldPrefix}-quantity`} className="block text-sm">Quantidade<input id={`${fieldPrefix}-quantity`} className="input-field mt-1" type="number" min="0.001" max="99999999" step="any" value={quantity} onChange={event => { setQuantity(event.target.value); setMessage(''); }} disabled={disabled || busy}/></label>
      <label htmlFor={`${fieldPrefix}-reason`} className="block text-sm sm:col-span-2">Motivo<textarea id={`${fieldPrefix}-reason`} className="input-field mt-1" rows={2} minLength={3} maxLength={1000} value={reason} onChange={event => { setReason(event.target.value); setMessage(''); }} disabled={disabled || busy}/></label>
      <button type="submit" className="btn-primary sm:col-span-2" aria-label={busy ? 'Enviando solicitação de material' : 'Solicitar material para esta ordem'} disabled={disabled || busy || !options.length}>{busy ? 'Enviando…' : 'Solicitar material'}</button>
    </form>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role={messageKind === 'status' ? 'status' : 'alert'} aria-live="polite" className="text-sm text-slate-700">{message}</p>}
    {!!requests.length && <div className="space-y-2 border-t border-slate-100 pt-3"><h5 className="text-sm font-medium">Solicitações desta ordem</h5>{requests.map(requestItem => <div key={requestItem.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-sm"><span><strong>{requestItem.item_nome}</strong> · {formatQuantity(requestItem.quantidade)} {requestItem.unidade}<span className="block text-xs text-slate-500">{requestItem.motivo}</span></span><span className="flex items-center gap-2"><span className="rounded-full bg-white px-2 py-1 text-xs">{formatStatus(requestItem.status)}</span>{canRequest && ['pendente','aprovada'].includes(requestItem.status) && <button type="button" className="btn-secondary" aria-label={`Cancelar solicitação de ${requestItem.item_nome}`} disabled={disabled || busy} onClick={async () => { if (!window.confirm('Cancelar esta solicitação de material?')) return; setBusy(true); try { await onCancel(requestItem); setMessageKind('status'); setMessage('Solicitação cancelada.'); } catch (cause) { setMessageKind('error'); setMessage(cause instanceof Error ? cause.message : 'Não foi possível cancelar a solicitação.'); } finally { setBusy(false); } }}>Cancelar</button>}</span></div>)}</div>}
  </section>;
}


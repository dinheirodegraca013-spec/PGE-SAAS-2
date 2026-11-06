import React, { useId, useRef, useState } from 'react';
import type { ProductionEntry, ProductionState } from '../services/technical-sheet.service';

const labels: Record<ProductionEntry['tipo'], string> = { produzido: 'Produzido', defeito: 'Defeito', desperdicio: 'Desperdício' };
const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const formatQuantity=(value:number)=>Number.isFinite(value)?numberFormat.format(value):'Quantidade indisponível';
const formatType=(value:string)=>labels[value as ProductionEntry['tipo']]??'Tipo indisponível';
const formatEntryDate=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Data não informada':new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);};
const safeEntryDateTime=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?undefined:date.toISOString();};

export default function ProductionLog({
  state,
  canRegister,
  disabled,
  error,
  onRegister,
  onRefresh,
}: {
  state: ProductionState | null;
  canRegister: boolean;
  disabled: boolean;
  error?: string;
  onRegister: (input: { request: string; type: ProductionEntry['tipo']; quantity: number; unit: string; description: string }) => Promise<void>;
  onRefresh: () => void;
}) {
  const id = useId();
  const [type, setType] = useState<ProductionEntry['tipo']>('produzido');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'status' | 'error'>('status');
  const request = useRef<{ payload: string; id: string } | null>(null);

  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`${id}-title`} aria-busy={busy}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h4 id={`${id}-title`} className="font-semibold">Produção e perdas</h4><p className="text-sm text-slate-500">Registre peças produzidas, defeitos e desperdícios por evento.</p></div>
      <button type="button" className="btn-secondary" onClick={onRefresh} disabled={disabled || busy} aria-label={busy?'Aguarde a atualização dos registros':'Atualizar registros'}>{busy?'Aguarde…':'Atualizar registros'}</button>
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      {(['produzido', 'defeito', 'desperdicio'] as const).map(item => <div key={item} className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">{labels[item]}</span><strong>{formatQuantity(state?.totais[item] ?? 0)}</strong></div>)}
    </div>
    {canRegister && <form className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2" aria-busy={busy} onSubmit={async event => {
      event.preventDefault();
      const value = Number(quantity);
      const normalizedUnit = unit.trim();
      if (!Number.isFinite(value) || value <= 0 || value >= 100000000 || !normalizedUnit || normalizedUnit.length > 40) { setMessageKind('error'); setMessage('Informe uma quantidade e unidade válidas.'); return; }
      if (description.trim().length < 3) { setMessageKind('error'); setMessage('Informe uma observação com pelo menos 3 caracteres.'); return; }
      const data = { type, quantity: value, unit: normalizedUnit, description: description.trim() };
      const payload = JSON.stringify(data);
      if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
      setBusy(true); setMessage('');
      try { await onRegister({ ...data, request: request.current.id }); request.current = null; setMessageKind('status'); setMessage('Registro salvo pelo servidor.'); }
      catch (cause) { setMessageKind('error'); setMessage(cause instanceof Error ? cause.message : 'Não foi possível salvar o registro.'); }
      finally { setBusy(false); }
    }}>
      <label htmlFor={`${id}-type`} className="block text-sm">Tipo<select id={`${id}-type`} className="input-field mt-1" value={type} onChange={event => { setType(event.target.value as ProductionEntry['tipo']); setMessage(''); }} disabled={disabled || busy}>{(Object.keys(labels) as ProductionEntry['tipo'][]).map(item => <option key={item} value={item}>{labels[item]}</option>)}</select></label>
      <label htmlFor={`${id}-quantity`} className="block text-sm">Quantidade<input id={`${id}-quantity`} className="input-field mt-1" type="number" inputMode="decimal" required min="0.001" max="99999999" step="any" value={quantity} onChange={event => { setQuantity(event.target.value); setMessage(''); }} disabled={disabled || busy}/></label>
      <label htmlFor={`${id}-unit`} className="block text-sm">Unidade<input id={`${id}-unit`} className="input-field mt-1" required maxLength={40} value={unit} onChange={event => { setUnit(event.target.value); setMessage(''); }} disabled={disabled || busy}/></label>
      <label htmlFor={`${id}-description`} className="block text-sm sm:col-span-2">Observação<textarea id={`${id}-description`} className="input-field mt-1" rows={2} minLength={3} maxLength={1000} required value={description} onChange={event => { setDescription(event.target.value); setMessage(''); }} disabled={disabled || busy}/></label>
      <button type="submit" className="btn-primary sm:col-span-2" aria-label={busy ? 'Salvando evento de produção' : 'Registrar evento de produção'} disabled={disabled || busy}>{busy ? 'Salvando…' : 'Registrar evento'}</button>
    </form>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role={messageKind === 'status' ? 'status' : 'alert'} aria-live="polite" className="text-sm text-slate-700">{message}</p>}
    {state && !state.registros.length && <p role="status" aria-live="polite" className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">Nenhum evento de produção registrado nesta ficha.</p>}{!!state?.registros.length && <div className="space-y-2 border-t border-slate-100 pt-3"><h5 className="text-sm font-medium">Últimos registros</h5>{state.registros.slice(0, 5).map(item => <div key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm" aria-label={`Evento ${formatType(item.tipo)} · ${formatQuantity(item.quantidade)} ${item.unidade} · ${formatEntryDate(item.criado_em)}`}><span><strong>{formatType(item.tipo)}</strong> · {formatQuantity(item.quantidade)} {item.unidade}{item.descricao && ` — ${item.descricao}`}</span><time className="text-xs text-slate-500" dateTime={safeEntryDateTime(item.criado_em)}>{formatEntryDate(item.criado_em)}</time></div>)}</div>}
  </section>;
}

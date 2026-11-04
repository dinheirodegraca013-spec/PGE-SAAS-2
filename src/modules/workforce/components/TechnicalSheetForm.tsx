import React, { useId, useState } from 'react';
import { validateTechnicalSheet, type TechnicalField, type SheetIssue } from '../lib/technical-sheet';

type Props = {
  fields: TechnicalField[];
  value: Record<string, unknown>;
  allowedPrivacy?: readonly string[];
  disabled?: boolean;
  attachmentOptions?: {id:string;nome:string}[];
  canLinkAttachments?: boolean;
  onChange: (value: Record<string, unknown>) => void;
  onSave: (value: Record<string, unknown>) => Promise<void>;
};

export default function TechnicalSheetForm({ fields, value, allowedPrivacy = [], disabled = false, attachmentOptions = [], canLinkAttachments = false, onChange, onSave }: Props) {
  const id = useId();
  const [issues, setIssues] = useState<SheetIssue[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const canEdit = (field: TechnicalField) => !field.readOnly && (!field.privacy || allowedPrivacy.includes(field.privacy));
  const writable = (schema: TechnicalField[], data: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(schema.filter(f => canEdit(f) && Object.prototype.hasOwnProperty.call(data, f.key)).map(f => [f.key,
      f.type === 'table' && Array.isArray(data[f.key])
        ? (data[f.key] as Record<string, unknown>[]).map(row => writable(f.columns ?? [], row)) : data[f.key],
    ]));
  function renderField(field: TechnicalField, data: Record<string, unknown>, change: (next: Record<string, unknown>) => void, prefix = ''): React.ReactNode {
    if (field.privacy && !allowedPrivacy.includes(field.privacy)) return null;
    const path = prefix + field.key;
    const controlId = `${id}-${path}`;
    const error = issues.find(i => i.path === path)?.message;
    const locked = disabled || busy || !canEdit(field);
    const current = data[field.key];
    const update = (next: unknown) => { setMessage(''); change({ ...data, [field.key]: next }); };
    const common = { id: controlId, disabled: locked, 'aria-invalid': !!error, 'aria-describedby': error ? `${controlId}-error` : undefined, className: 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100' };
    if (field.type === 'table') {
      const rows = Array.isArray(current) ? current as Record<string, unknown>[] : [];
      return <fieldset key={path} className="min-w-0 rounded-xl border border-slate-200 p-3">
        <legend className="px-1 font-medium">{field.label}</legend>
        <div className="space-y-3">{rows.map((row, index) => <fieldset key={index} className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm">Item {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2">{(field.columns ?? []).map(column => renderField(column, row, next => update(rows.map((item, i) => i === index ? next : item)), `${path}.${index}.`))}</div>
          <button type="button" disabled={locked} onClick={() => update(rows.filter((_, i) => i !== index))} className="mt-3 rounded-lg border px-3 py-2 text-sm">Remover item {index + 1}</button>
        </fieldset>)}</div>
        <button type="button" disabled={locked || rows.length >= 1000} onClick={() => update([...rows, {}])} className="mt-3 rounded-lg border px-3 py-2 text-sm">Adicionar item</button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </fieldset>;
    }
    // Only server-listed private attachments may be selected; never typed URLs or IDs.
    if (field.type === 'file') return <div key={path} className="text-sm">
      <label htmlFor={controlId} className="mb-1 block font-medium">{field.label}</label>
      {canLinkAttachments?<><select {...common} value={typeof current==='string'?current:''} onChange={event=>update(event.target.value||null)}>
        <option value="">Sem anexo vinculado</option>
        {typeof current==='string' && current && !attachmentOptions.some(item=>item.id===current) && <option value={current}>Anexo atual (fora da página de anexos)</option>}
        {attachmentOptions.map(item=><option key={item.id} value={item.id}>{item.nome}</option>)}
      </select><p className="mt-1 text-xs text-slate-500">Opções da página atual em Anexos privados. Envie arquivos ou mude a página nessa seção e salve a ficha após selecionar.</p></>:<p className="text-slate-500">{current ? 'Anexo vinculado à ordem.' : 'Nenhum anexo vinculado.'}</p>}
      {error && <p id={`${controlId}-error`} role="alert" className="text-sm text-red-700">{error}</p>}
    </div>;
    return <div key={path} className="min-w-0">
      <label htmlFor={controlId} className="mb-1 block text-sm font-medium">{field.label}{field.required ? ' *' : ''}</label>
      {field.type === 'textarea'
        ? <textarea {...common} rows={3} maxLength={10000} value={typeof current === 'string' ? current : ''} onChange={e => update(e.target.value)} />
        : <input {...common} type={['number', 'integer'].includes(field.type) ? 'number' : field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : 'text'} min={field.type === 'number' || field.type === 'integer' ? 0 : undefined} step={field.type === 'integer' ? 1 : 'any'} maxLength={2000} value={typeof current === 'string' || typeof current === 'number' ? current : ''} onChange={e => update(field.type === 'number' || field.type === 'integer' ? e.target.value === '' ? null : Number(e.target.value) : e.target.value)} />}
      {error && <p id={`${controlId}-error`} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>;
  }
  return <form noValidate onSubmit={async event => {
    event.preventDefault();
    if (busy || disabled) return;
    const patch = writable(fields, value);
    const errors = validateTechnicalSheet(fields.filter(canEdit), patch, allowedPrivacy, true);
    setIssues(errors); setMessage('');
    if (errors.length) { setMessage('Revise os campos indicados antes de salvar.'); return; }
    setBusy(true);
    try { await onSave(patch); setMessage('Ficha técnica salva.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.'); }
    finally { setBusy(false); }
  }} className="space-y-4" aria-busy={busy}>
    <div className="grid min-w-0 gap-4">{fields.map(field => renderField(field, value, onChange))}</div>
    {message && <p role="status" aria-live="polite" className="text-sm">{message}</p>}
    <button type="submit" disabled={busy || disabled} className="rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3 text-white disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar ficha técnica'}</button>
  </form>;
}

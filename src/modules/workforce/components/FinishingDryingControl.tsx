import React, { useId, useState } from 'react';
import type { FinishingDryingState } from '../services/technical-sheet.service';

function formatServerDate(value: string | null): string {
  if (!value) return 'Ainda não registrada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function FinishingDryingControl({
  state,
  canRegister,
  disabled,
  error,
  onRegister,
  onRefresh,
}: {
  state: FinishingDryingState | null;
  canRegister: boolean;
  disabled: boolean;
  error?: string;
  onRegister: (minutes: number) => Promise<void>;
  onRefresh: () => void;
}) {
  const id = useId();
  const [minutes, setMinutes] = useState('60');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`${id}-title`} aria-busy={busy}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 id={`${id}-title`} className="font-semibold">Controle de secagem</h4>
        <p className="text-sm text-slate-500">Os horários exibidos são registrados pelo servidor.</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${state?.em_secagem ? 'bg-amber-100 text-amber-900' : state ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
        {state ? (state.em_secagem ? 'Em secagem' : 'Secagem liberada') : 'Horário indisponível'}
      </span>
    </div>
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div><dt className="text-slate-500">Iniciada em</dt><dd>{formatServerDate(state?.iniciada_em ?? null)}</dd></div>
      <div><dt className="text-slate-500">Liberada para concluir em</dt><dd>{formatServerDate(state?.prevista_ate ?? null)}</dd></div>
    </dl>
    {canRegister && <form className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3" aria-busy={busy} onSubmit={async event => {
      event.preventDefault();
      const value = Number(minutes);
      if (!Number.isInteger(value) || value < 1 || value > 10080) { setMessage('Informe de 1 a 10.080 minutos.'); return; }
      setBusy(true); setMessage('');
      try { await onRegister(value); setMessage('Secagem registrada pelo servidor.'); }
      catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Não foi possível registrar a secagem.'); }
      finally { setBusy(false); }
    }}>
      <label htmlFor={`${id}-minutes`} className="text-sm">Adicionar prazo (minutos)
        <input id={`${id}-minutes`} className="input-field mt-1 w-44" type="number" min={1} max={10080} step={1} value={minutes} onChange={event => setMinutes(event.target.value)} disabled={disabled || busy} />
      </label>
      <button type="submit" className="btn-primary" disabled={disabled || busy}>{busy ? 'Registrando…' : state?.em_secagem ? 'Estender secagem' : 'Iniciar secagem'}</button>
    </form>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role={message.includes('registrada') ? 'status' : 'alert'} aria-live="polite" className="text-sm text-slate-700">{message}</p>}
    <button type="button" className="btn-secondary" onClick={onRefresh} disabled={disabled || busy}>Atualizar horário do servidor</button>
  </section>;
}


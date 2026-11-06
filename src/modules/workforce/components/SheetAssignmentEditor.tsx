import React, { useEffect, useId, useState } from 'react';
import { technicalSheets } from '../services/technical-sheet.service';

export default function SheetAssignmentEditor({serviceId,sector,current,disabled,onAssign}:{serviceId:string;sector:string;current:string|null;disabled:boolean;onAssign:(employee:string|null)=>Promise<void>}) {
  const id = useId();
  const [candidates,setCandidates] = useState<Awaited<ReturnType<typeof technicalSheets.candidates>>>([]);
  const [selected,setSelected] = useState(current || '');
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [retry,setRetry] = useState(0);
  useEffect(()=>{setSelected(current || '');setMessage('');},[current]);
  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');setMessage('');setCandidates([]);
    technicalSheets.candidates(serviceId,sector).then(items=>{if(active)setCandidates(items);})
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar os responsáveis.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[serviceId,sector,retry]);
  return <form className="space-y-3 rounded-xl border border-slate-200 p-4" aria-label="Responsável pela ficha deste setor" aria-busy={loading || busy} onSubmit={async event=>{
    event.preventDefault();if(disabled || busy || loading)return;
    if(selected && !candidates.some(item=>item.id===selected)){setError('Escolha um funcionário disponível.');return;}
    setBusy(true);setError('');setMessage('');
    try{await onAssign(selected || null);setMessage('Responsável atualizado.');}
    catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível atualizar o responsável.');}
    finally{setBusy(false);}
  }}>
    <label htmlFor={id} className="block text-sm font-medium">Responsável pela ficha deste setor</label>
    <select id={id} className="input-field" disabled={disabled || busy || loading || !!error && !candidates.length} value={selected} onChange={event=>{setSelected(event.target.value);setMessage('');setError('');}}>
      <option value="">Sem responsável</option>
      {current && !candidates.some(item=>item.id===current) && <option value={current} disabled>Responsável anterior indisponível</option>}
      {candidates.map(item=><option key={item.id} value={item.id}>{item.nome || 'Funcionário sem nome'}{item.cargo?` — ${item.cargo}`:''}</option>)}
    </select>
    {loading && <p role="status" aria-live="polite" className="text-sm">Carregando funcionários autorizados…</p>}
    {!loading && !error && !candidates.length && <p role="status" aria-live="polite" className="text-sm text-slate-500">Nenhum funcionário autorizado para este setor.</p>}
    {error && <div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" className="btn-secondary" aria-label="Tentar carregar os responsáveis novamente" disabled={loading || busy} onClick={()=>setRetry(n=>n+1)}>Atualizar lista</button></div>}
    {message && <p role="status" aria-live="polite" className="text-sm">{message}</p>}
    <button type="submit" className="btn-secondary" aria-label={busy?'Salvando responsável':'Salvar responsável da ficha'} disabled={disabled || busy || loading || selected===(current || '')}>{busy?'Salvando…':'Salvar responsável'}</button>
  </form>;
}


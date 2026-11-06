import React,{useEffect,useId,useRef,useState} from 'react';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {hasPermission} from '../lib/access';
import {incidents,type Incident,type IncidentType,type IncidentSeverity} from '../services/incidents.service';
const types={equipamento:'Problema com equipamento',material:'Material em falta',defeito:'Defeito ou retrabalho',outro:'Outra ocorrência'};
const severities={informativa:'Informativa',atencao:'Atenção',critica:'Crítica'};
const formatIncidentType=(value:string)=>types[value as IncidentType]??'Tipo não informado';
const formatIncidentSeverity=(value:string)=>severities[value as IncidentSeverity]??'Gravidade não informada';

function Resolution({incident,onSaved}:{incident:Incident;onSaved:()=>void}){
  const id=useId();const [text,setText]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false);
  const clearError=()=>setError('');
  return <form className="space-y-2" aria-busy={busy} onSubmit={async event=>{
    event.preventDefault();if(lock.current)return;
    if(text.trim().length<10){setError('Descreva a resolução em pelo menos 10 caracteres.');return;}
    if(!window.confirm('Registrar esta ocorrência como resolvida?'))return;
    lock.current=true;setBusy(true);setError('');
    try{await incidents.resolve(incident,text.trim());onSaved();}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível resolver a ocorrência.');}finally{lock.current=false;setBusy(false);}
  }}><label htmlFor={id} className="block text-sm">Como o problema foi resolvido?<textarea id={id} className="input-field mt-1" rows={3} required minLength={10} maxLength={5000} disabled={busy} value={text} onChange={event=>{setText(event.target.value);clearError();}}/></label>{error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}<button type="submit" className="btn-secondary" aria-label={busy?'Salvando resolução da ocorrência':'Registrar resolução da ocorrência'} disabled={busy}>{busy?'Salvando…':'Registrar resolução'}</button></form>;
}

export default function SheetIncidents({serviceId,sector,canCreate}:{serviceId:string;sector:string;canCreate:boolean}){
  const {context}=useWorkforceAccess();const id=useId();const canView=hasPermission(context,'ocorrencias');
  const [items,setItems]=useState<Incident[]>([]);const [page,setPage]=useState(0);const [more,setMore]=useState(false);const [refresh,setRefresh]=useState(0);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [type,setType]=useState<IncidentType>('outro');const [severity,setSeverity]=useState<IncidentSeverity>('atencao');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const lock=useRef(false);const receipt=useRef<{payload:string;id:string}|null>(null);const generation=useRef(0);const lastReturnRefresh=useRef(0);
  const clearFeedback=()=>{setError('');setMessage('');};
  useEffect(()=>{setTitle('');setDescription('');setType('outro');setSeverity('atencao');setMessage('');receipt.current=null;},[serviceId,sector]);
  useEffect(()=>{generation.current++;},[serviceId,sector]);
  useEffect(()=>{setPage(0);},[serviceId,sector,context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{setItems([]);setMore(false);},[serviceId,sector,page,context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{const refreshOnReturn=()=>{const now=Date.now();if(document.visibilityState==='visible'&&now-lastReturnRefresh.current>1000){lastReturnRefresh.current=now;setRefresh(value=>value+1);}};window.addEventListener('focus',refreshOnReturn);document.addEventListener('visibilitychange',refreshOnReturn);return()=>{window.removeEventListener('focus',refreshOnReturn);document.removeEventListener('visibilitychange',refreshOnReturn);};},[serviceId,sector]);
  useEffect(()=>{if(!canView){setLoading(false);setItems([]);return;}let active=true;setLoading(true);setError('');
    incidents.list(serviceId,sector,page).then(result=>{if(active){setItems(result.itens);setMore(result.tem_mais);}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar ocorrências.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[serviceId,sector,page,refresh,canView,context?.funcionario.id,context?.funcionario.versao]);
  if(!canView && !canCreate)return null;
  return <section className="space-y-4 rounded-xl border border-slate-200 p-4" aria-labelledby={`${id}-title`} aria-busy={loading || busy}><h4 id={`${id}-title`} className="font-semibold">Ocorrências desta ficha</h4>
    {canCreate && <form className="grid gap-3 sm:grid-cols-2" aria-busy={busy} onSubmit={async event=>{
      event.preventDefault();if(lock.current)return;
      if(title.trim().length<3 || description.trim().length<10){setError('Informe um título e descreva o problema em pelo menos 10 caracteres.');return;}
      const input={service:serviceId,sector,title:title.trim(),description:description.trim(),type,severity};const payload=JSON.stringify(input);
      if(receipt.current?.payload!==payload)receipt.current={payload,id:crypto.randomUUID()};
      lock.current=true;setBusy(true);setError('');setMessage('');const request=generation.current;
      try{await incidents.create({...input,request:receipt.current.id});if(request!==generation.current)return;receipt.current=null;setTitle('');setDescription('');setMessage('Ocorrência registrada.');setPage(0);setRefresh(n=>n+1);}
      catch(cause){if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível comunicar a ocorrência.');}
      finally{lock.current=false;setBusy(false);}
    }}>
      <label htmlFor={`${id}-title`} className="text-sm sm:col-span-2">Título<input id={`${id}-title`} className="input-field mt-1" required minLength={3} maxLength={200} disabled={busy} value={title} onChange={event=>{setTitle(event.target.value);clearFeedback();}}/></label>
      <label htmlFor={`${id}-description`} className="text-sm sm:col-span-2">Descrição do problema<textarea id={`${id}-description`} className="input-field mt-1" rows={3} required minLength={10} maxLength={10000} disabled={busy} value={description} onChange={event=>{setDescription(event.target.value);clearFeedback();}}/></label>
      <label htmlFor={`${id}-type`} className="text-sm">Tipo<select id={`${id}-type`} className="input-field mt-1" disabled={busy} value={type} onChange={event=>{setType(event.target.value as IncidentType);clearFeedback();}}>{Object.entries(types).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label htmlFor={`${id}-severity`} className="text-sm">Gravidade<select id={`${id}-severity`} className="input-field mt-1" disabled={busy} value={severity} onChange={event=>{setSeverity(event.target.value as IncidentSeverity);clearFeedback();}}>{Object.entries(severities).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <button type="submit" className="btn-primary" aria-label={busy?'Registrando ocorrência':'Comunicar ocorrência'} disabled={busy}>{busy?'Registrando…':'Comunicar ocorrência'}</button>
    </form>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700"><span className="min-w-0 break-words">{error}</span><button type="button" className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" disabled={loading || busy} onClick={()=>setRefresh(n=>n+1)}>Tentar novamente</button></div>}{message && <p role="status" aria-live="polite" className="text-sm">{message}</p>}
    {canView && <>{loading?<p role="status" aria-live="polite">{items.length?'Atualizando ocorrências…':'Carregando ocorrências…'}</p>:!error&&!items.length?<p role="status" aria-live="polite" className="text-sm text-slate-500">Nenhuma ocorrência disponível nesta página.</p>:null}
      <ul className="space-y-3">{items.map(item=>{const incidentTitle=item.titulo||'Ocorrência sem título';const incidentStatus=item.status==='aberta'?'Aberta':'Resolvida';return <li key={`${item.id}:${item.versao}`} className="min-w-0 space-y-2 rounded-lg border p-3" aria-label={`Ocorrência ${incidentTitle} · ${formatIncidentSeverity(item.gravidade)} · ${incidentStatus}`}><p className="break-words font-medium">{incidentTitle}</p><p className="break-words text-xs text-slate-500">{formatIncidentType(item.tipo)} · {formatIncidentSeverity(item.gravidade)} · {incidentStatus}</p><p className="break-words whitespace-pre-wrap text-sm">{item.descricao}</p>{item.resolucao && <p className="break-words whitespace-pre-wrap text-sm text-emerald-800">Resolução: {item.resolucao}</p>}{item.status==='aberta' && item.pode_resolver && <Resolution incident={item} onSaved={()=>setRefresh(n=>n+1)}/>}</li>})}</ul>
      {(items.length || page>0 || more) && <nav aria-label="Paginação de ocorrências" className="flex flex-wrap gap-3"><button type="button" className="btn-secondary" aria-label="Ir para a página anterior de ocorrências" disabled={loading || busy || page===0} onClick={()=>setPage(n=>n-1)}>Anterior</button><span className="self-center text-sm" aria-current="page" aria-live="polite">Página {page+1}</span><button type="button" className="btn-secondary" aria-label="Ir para a próxima página de ocorrências" disabled={loading || busy || !more} onClick={()=>setPage(n=>n+1)}>Próxima</button><button type="button" className="btn-secondary" disabled={loading || busy} onClick={()=>setRefresh(n=>n+1)} aria-label={loading || busy?'Aguarde a atualização das ocorrências':'Atualizar ocorrências'}>{loading || busy?'Aguarde…':'Atualizar ocorrências'}</button></nav>}
    </>}
  </section>;
}

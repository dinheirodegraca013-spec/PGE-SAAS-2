import React, {useEffect,useId,useRef,useState} from 'react';
import {isSetor,setores} from '@/lib/setores';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {servicePipeline,type ServiceFlow} from '../services/pipeline.service';

export default function ServicePipelineEditor({serviceId}:{serviceId:string}){
  const {context}=useWorkforceAccess();
  const id=useId();
  const [flow,setFlow]=useState<ServiceFlow|null>(null);
  const [selected,setSelected]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [retry,setRetry]=useState(0);
  const lock=useRef(false);
  useEffect(()=>{setFlow(null);setSelected([]);},[serviceId,context?.proprietario]);
  useEffect(()=>{
    if(!context?.proprietario)return;
    let active=true;setLoading(true);setError('');setMessage('');
    servicePipeline.load(serviceId).then(result=>{if(active){setFlow(result);setSelected(result.setores);}})
      .catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar o fluxo.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[serviceId,context?.proprietario,retry]);
  if(!context?.proprietario)return null;
  const disabled=busy || loading || !flow?.editavel;
  const move=(index:number,offset:number)=>{setMessage('');setError('');setSelected(current=>{
    const next=[...current];const targetIndex=index+offset;[next[index],next[targetIndex]]=[next[targetIndex],next[index]];
    const moved=isSetor(next[targetIndex])?setores[next[targetIndex]]:next[targetIndex];
    setMessage(`${moved} movida para a posição ${targetIndex+1}.`);return next;
  });};
  return <section className="card space-y-4 p-6" aria-labelledby={`${id}-title`} aria-busy={loading || busy}>
    <h3 id={`${id}-title`} className="font-semibold">Fluxo de produção</h3>
    <p className="text-sm text-slate-500">Selecione as etapas necessárias e ordene a execução. Estoque permanece como apoio.</p>
    {loading && <p role="status" aria-live="polite">{flow ? 'Atualizando fluxo…' : 'Carregando fluxo…'}</p>}
    {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
    {message && <p role="status" aria-live="polite" className="text-sm">{message}</p>}
    {flow && <form className="space-y-4" onSubmit={async event=>{
      event.preventDefault();if(disabled || lock.current)return;
      if(!selected.length){setError('Escolha pelo menos uma etapa.');return;}
      lock.current=true;setBusy(true);setError('');setMessage('');
      try{const result=await servicePipeline.save(serviceId,selected,flow.versao);setFlow({...flow,...result,configurado:true});setMessage('Fluxo salvo. As fichas dos setores foram liberadas.');}
      catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível salvar o fluxo.');}
      finally{lock.current=false;setBusy(false);}
    }}>
      {!flow.editavel && <p className="text-sm text-slate-500">A execução já começou. A sequência está bloqueada para preservar o histórico.</p>}
      <fieldset disabled={disabled} className="flex flex-wrap gap-4"><legend className="sr-only">Etapas incluídas</legend>
        {Object.entries(setores).filter(([sector])=>sector!=='estoque').map(([sector,label])=><label key={sector} htmlFor={`${id}-${sector}`} className="flex min-w-0 items-start gap-2 text-sm"><input id={`${id}-${sector}`} type="checkbox" checked={selected.includes(sector)} onChange={event=>{setMessage('');setError('');setSelected(current=>event.target.checked?[...current,sector]:current.filter(item=>item!==sector));}}/><span className="min-w-0 break-words">{label}</span></label>)}
      </fieldset>
      <ol className="space-y-2">{selected.map((sector,index)=><li key={sector} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <span className="min-w-0 flex-1 break-words text-sm">{index+1}. {isSetor(sector)?setores[sector]:sector}</span>
        <button type="button" className="btn-secondary min-h-11 min-w-11 shrink-0 px-3" disabled={disabled || index===0} aria-label={`Mover ${isSetor(sector)?setores[sector]:sector} para cima`} onClick={()=>move(index,-1)}>↑</button>
        <button type="button" className="btn-secondary min-h-11 min-w-11 shrink-0 px-3" disabled={disabled || index===selected.length-1} aria-label={`Mover ${isSetor(sector)?setores[sector]:sector} para baixo`} onClick={()=>move(index,1)}>↓</button>
      </li>)}</ol>
      <button type="submit" className="btn-primary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={disabled} aria-label={busy?'Salvando fluxo':flow.configurado?'Salvar sequência':'Configurar fluxo'}>{busy?'Salvando…':flow.configurado?'Salvar sequência':'Configurar fluxo'}</button>
    </form>}
    <button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={busy || loading} aria-label={loading?'Carregando fluxo':'Recarregar fluxo'} onClick={()=>{
      if(flow && JSON.stringify(selected)!==JSON.stringify(flow.setores) && !window.confirm('Descartar a sequência não salva e recarregar?'))return;
      setRetry(n=>n+1);
    }}>{loading?'Carregando…':'Recarregar fluxo'}</button>
  </section>;
}


import React,{useEffect,useRef,useState} from 'react';
import {isSetor,setores} from '@/lib/setores';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {workNotifications,type NotificationPage,type WorkNotification} from '../services/notifications.service';
import ServiceTechnicalSheet from './ServiceTechnicalSheet';
import TaskDetails from './TaskDetails';

function formatNotificationDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Data não informada':date.toLocaleString('pt-BR');}
function safeNotificationDateTime(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?undefined:date.toISOString();}
const notificationLabels:Record<string,string>={tarefa_atribuida:'Nova tarefa atribuída',ficha_atribuida:'Ficha atribuída',etapa_liberada:'Etapa liberada para execução'};
const workforceRefreshEvent='gestio:refresh-workforce';

export default function WorkNotifications(){
  const {context}=useWorkforceAccess();
  const [data,setData]=useState<NotificationPage|null>(null);
  const [page,setPage]=useState(0);
  const [refresh,setRefresh]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [selected,setSelected]=useState<WorkNotification|null>(null);
  const [updatedAt,setUpdatedAt]=useState<Date|null>(null);
  const [message,setMessage]=useState('');
  const generation=useRef(0);
  const reading=useRef(false);
  const lastReturnRefresh=useRef(0);
  const selectedRef=useRef<HTMLDivElement>(null);
  const openerRef=useRef<HTMLButtonElement>(null);
  const returnFocus=useRef(false);
  useEffect(()=>{setPage(0);},[context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{setData(null);setSelected(null);setUpdatedAt(null);setMessage('');},[page,context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{setSelected(null);setUpdatedAt(null);},[page]);
  useEffect(()=>{reading.current=false;setBusy(null);},[page,context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{if(selected)selectedRef.current?.focus();},[selected]);
  useEffect(()=>{if(!selected&&returnFocus.current){returnFocus.current=false;openerRef.current?.focus();}},[selected]);
  useEffect(()=>{const refreshOnReturn=()=>{const now=Date.now();if(document.visibilityState==='visible'&&now-lastReturnRefresh.current>1000){lastReturnRefresh.current=now;setRefresh(value=>value+1);}};window.addEventListener('focus',refreshOnReturn);document.addEventListener('visibilitychange',refreshOnReturn);return()=>{window.removeEventListener('focus',refreshOnReturn);document.removeEventListener('visibilitychange',refreshOnReturn);};},[context?.funcionario.id]);
  useEffect(()=>{const refreshPanel=()=>setRefresh(value=>value+1);window.addEventListener(workforceRefreshEvent,refreshPanel);return()=>window.removeEventListener(workforceRefreshEvent,refreshPanel);},[]);
  useEffect(()=>{
    const request=++generation.current;setLoading(true);setError('');
    workNotifications.list(page).then(result=>{if(request===generation.current){setData(result);setUpdatedAt(new Date());setSelected(current=>current && result.itens.some(item=>item.id===current.id)?current:null);}})
      .catch(cause=>{if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível carregar as notificações.');})
      .finally(()=>{if(request===generation.current)setLoading(false);});
    return()=>{generation.current++;};
  },[page,refresh,context?.funcionario.id,context?.funcionario.versao]);
  return <section className="card space-y-4 p-5" aria-labelledby="work-notifications-title" aria-busy={loading || !!busy}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 id="work-notifications-title" className="break-words text-lg font-bold">Notificações <span aria-live="polite">{data?(data.nao_lidas>0?<span className="ml-2 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800" aria-label={`${data.nao_lidas} notificações não lidas`}>{data.nao_lidas} não lidas</span>:<span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Tudo lido</span>):''}</span></h2><span className="text-xs text-slate-500" aria-live="polite">{updatedAt?`Atualizadas às ${updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando atualização'}</span></div><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={loading || !!busy} onClick={()=>setRefresh(n=>n+1)} aria-label={loading || !!busy?'Aguarde a atualização das notificações':'Atualizar notificações'}>{loading || !!busy?'Aguarde…':'Atualizar notificações'}</button></div>
    {loading && <p role="status" aria-live="polite">{data ? 'Atualizando notificações…' : 'Carregando notificações…'}</p>}{busy && <p role="status" aria-live="polite">Salvando leitura da notificação…</p>}{message && <p role="status" aria-live="polite">{message}</p>}
    {error && <div role="alert" className="flex flex-col gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0 break-words">{error}</span><button type="button" className="w-full shrink-0 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 sm:w-auto" disabled={loading || !!busy} aria-label={loading || !!busy?'Aguarde a atualização das notificações':'Tentar carregar as notificações novamente'} onClick={()=>setRefresh(n=>n+1)}>{loading || !!busy?'Aguarde…':'Tentar novamente'}</button></div>}
    {data && !data.itens.length && <p role="status" aria-live="polite" className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">Nenhuma notificação disponível. Quando houver uma nova tarefa ou etapa liberada, ela aparecerá aqui.</p>}
    {data && <ul className="divide-y divide-slate-100">{data.itens.map(item=><li key={item.id} className="space-y-2 py-3" aria-busy={busy===item.id} aria-label={`${item.lida_em?'Notificação lida':'Notificação não lida'}: ${notificationLabels[item.evento]||'Atualização da operação'}`}>
       <p className={item.lida_em?'break-words text-sm text-slate-600':'flex flex-wrap items-center gap-2 break-words text-sm font-semibold'}>{!item.lida_em&&<span className="shrink-0 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-800">Não lida</span>}{notificationLabels[item.evento]||'Atualização da operação'} · {isSetor(item.setor)?setores[item.setor]:item.setor||'Setor não informado'}</p>
      <time className="block text-xs text-slate-500" dateTime={safeNotificationDateTime(item.criada_em)}>{formatNotificationDate(item.criada_em)}</time>
      <div className="flex flex-wrap gap-2">{(item.tarefa_id||item.servico_id)&&<button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={!!busy} aria-label={item.tarefa_id?'Abrir tarefa relacionada':'Abrir ficha relacionada'} onClick={event=>{
        if(selected && !window.confirm('Abrir esta ficha? Alterações não salvas da ficha atual serão descartadas.'))return;
        setError('');openerRef.current=event.currentTarget;setSelected(item);
      }}>{item.tarefa_id?'Abrir tarefa relacionada':'Abrir ficha relacionada'}</button>}{!item.tarefa_id&&!item.servico_id&&<span className="self-center text-xs text-slate-500">Sem registro relacionado</span>}
      {!item.lida_em && <button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={!!busy} aria-label={`Marcar como lida: ${notificationLabels[item.evento]||'Atualização da operação'}`} onClick={async()=>{
        if(reading.current)return;reading.current=true;setBusy(item.id);setError('');setMessage('');const request=generation.current;
        try{const result=await workNotifications.read(item.id);if(request===generation.current){setData(current=>current?{...current,nao_lidas:Math.max(0,current.nao_lidas-1),itens:current.itens.map(n=>n.id===item.id?{...n,lida_em:result.lida_em}:n)}:current);setMessage('Notificação marcada como lida.');}}
        catch(cause){if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível registrar a leitura.');}
        finally{if(request===generation.current){reading.current=false;setBusy(null);}}
      }}>{busy===item.id?'Salvando…':'Marcar como lida'}</button>}</div>
    </li>)}</ul>}
    {data && (data.itens.length || page>0 || data.tem_mais) && <nav aria-label="Paginação de notificações" className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Ir para a página anterior" disabled={page===0 || !!busy} onClick={()=>setPage(n=>n-1)}>Anterior</button><span className="shrink-0 text-center text-sm sm:text-left" aria-current="page" aria-live="polite">Página {page+1}</span><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Ir para a próxima página" disabled={!data.tem_mais || !!busy} onClick={()=>setPage(n=>n+1)}>Próxima</button></nav>}
    {selected && <div ref={selectedRef} tabIndex={-1} className="space-y-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2" aria-label="Detalhe da notificação aberta"><div className="flex justify-end"><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Fechar detalhe da notificação" onClick={()=>{returnFocus.current=true;setSelected(null);}}>Fechar detalhe</button></div>{selected.tarefa_id?<TaskDetails key={selected.tarefa_id} taskId={selected.tarefa_id}/>:selected.servico_id?<ServiceTechnicalSheet key={`${selected.servico_id}:${selected.setor}`} serviceId={selected.servico_id} sector={selected.setor}/>:null}</div>}
  </section>;
}

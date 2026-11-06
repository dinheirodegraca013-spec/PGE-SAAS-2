import React,{useEffect,useRef,useState} from 'react';
import {isSetor,setores} from '@/lib/setores';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {workNotifications,type NotificationPage,type WorkNotification} from '../services/notifications.service';
import ServiceTechnicalSheet from './ServiceTechnicalSheet';
import TaskDetails from './TaskDetails';

function formatNotificationDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Data não informada':date.toLocaleString('pt-BR');}
function safeNotificationDateTime(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?undefined:date.toISOString();}
const notificationLabels:Record<string,string>={tarefa_atribuida:'Nova tarefa atribuída',etapa_liberada:'Etapa liberada para execução'};

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
  const generation=useRef(0);
  const reading=useRef(false);
  const lastReturnRefresh=useRef(0);
  useEffect(()=>{setPage(0);},[context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{setData(null);setSelected(null);setUpdatedAt(null);},[context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{setSelected(null);setUpdatedAt(null);},[page]);
  useEffect(()=>{reading.current=false;setBusy(null);},[page,context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{const refreshOnReturn=()=>{const now=Date.now();if(document.visibilityState==='visible'&&now-lastReturnRefresh.current>1000){lastReturnRefresh.current=now;setRefresh(value=>value+1);}};window.addEventListener('focus',refreshOnReturn);document.addEventListener('visibilitychange',refreshOnReturn);return()=>{window.removeEventListener('focus',refreshOnReturn);document.removeEventListener('visibilitychange',refreshOnReturn);};},[context?.funcionario.id]);
  useEffect(()=>{
    const request=++generation.current;setLoading(true);setError('');
    workNotifications.list(page).then(result=>{if(request===generation.current){setData(result);setUpdatedAt(new Date());setSelected(current=>current && result.itens.some(item=>item.id===current.id)?current:null);}})
      .catch(cause=>{if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível carregar as notificações.');})
      .finally(()=>{if(request===generation.current)setLoading(false);});
    return()=>{generation.current++;};
  },[page,refresh,context?.funcionario.id,context?.funcionario.versao]);
  return <section className="card space-y-4 p-5" aria-busy={loading || !!busy}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Notificações <span aria-live="polite">{data?`(${data.nao_lidas} não lidas)`:''}</span></h2><span className="text-xs text-slate-500" aria-live="polite">{updatedAt?`Atualizadas às ${updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando atualização'}</span></div><button type="button" className="btn-secondary" disabled={loading || !!busy} onClick={()=>setRefresh(n=>n+1)} aria-label={loading || !!busy?'Aguarde a atualização das notificações':'Atualizar notificações'}>{loading || !!busy?'Aguarde…':'Atualizar notificações'}</button></div>
    {loading && <p role="status" aria-live="polite">Carregando notificações…</p>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" onClick={()=>setRefresh(n=>n+1)}>Tentar novamente</button></div>}
    {data && !data.itens.length && <p className="text-sm text-slate-500">Nenhuma notificação disponível.</p>}
    {data && <ul className="divide-y divide-slate-100">{data.itens.map(item=><li key={item.id} className="space-y-2 py-3">
      <p className={item.lida_em?'text-sm text-slate-600':'text-sm font-semibold'}>{notificationLabels[item.evento]||'Atualização da operação'} · {isSetor(item.setor)?setores[item.setor]:item.setor||'Setor não informado'}</p>
      <time className="block text-xs text-slate-500" dateTime={safeNotificationDateTime(item.criada_em)}>{formatNotificationDate(item.criada_em)}</time>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" disabled={!!busy} onClick={()=>{
        if(selected && !window.confirm('Abrir esta ficha? Alterações não salvas da ficha atual serão descartadas.'))return;
        setError('');setSelected(item);
      }}>{item.tarefa_id?'Abrir tarefa relacionada':'Abrir ficha relacionada'}</button>
      {!item.lida_em && <button type="button" className="btn-secondary" disabled={!!busy} onClick={async()=>{
        if(reading.current)return;reading.current=true;setBusy(item.id);setError('');const request=generation.current;
        try{const result=await workNotifications.read(item.id);if(request===generation.current)setData(current=>current?{...current,nao_lidas:Math.max(0,current.nao_lidas-1),itens:current.itens.map(n=>n.id===item.id?{...n,lida_em:result.lida_em}:n)}:current);}
        catch(cause){if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível registrar a leitura.');}
        finally{if(request===generation.current){reading.current=false;setBusy(null);}}
      }}>{busy===item.id?'Salvando…':'Marcar como lida'}</button>}</div>
    </li>)}</ul>}
    {data && <nav aria-label="Paginação de notificações" className="flex items-center gap-3"><button type="button" className="btn-secondary" disabled={page===0 || !!busy} onClick={()=>setPage(n=>n-1)}>Anterior</button><span className="text-sm" aria-current="page">Página {page+1}</span><button type="button" className="btn-secondary" disabled={!data.tem_mais || !!busy} onClick={()=>setPage(n=>n+1)}>Próxima</button></nav>}
    {selected && <div className="space-y-3"><div className="flex justify-end"><button type="button" className="btn-secondary" onClick={()=>setSelected(null)}>Fechar detalhe</button></div>{selected.tarefa_id?<TaskDetails key={selected.tarefa_id} taskId={selected.tarefa_id}/>:selected.servico_id?<ServiceTechnicalSheet key={`${selected.servico_id}:${selected.setor}`} serviceId={selected.servico_id} sector={selected.setor}/>:null}</div>}
  </section>;
}


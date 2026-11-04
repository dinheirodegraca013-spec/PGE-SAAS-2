import React,{useEffect,useRef,useState} from 'react';
import {isSetor,setores} from '@/lib/setores';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {workNotifications,type NotificationPage,type WorkNotification} from '../services/notifications.service';
import ServiceTechnicalSheet from './ServiceTechnicalSheet';

export default function WorkNotifications(){
  const {context}=useWorkforceAccess();
  const [data,setData]=useState<NotificationPage|null>(null);
  const [page,setPage]=useState(0);
  const [refresh,setRefresh]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [selected,setSelected]=useState<WorkNotification|null>(null);
  const generation=useRef(0);
  const reading=useRef(false);
  useEffect(()=>{
    const request=++generation.current;setLoading(true);setError('');setData(null);setSelected(null);
    workNotifications.list(page).then(result=>{if(request===generation.current)setData(result);})
      .catch(cause=>{if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível carregar as notificações.');})
      .finally(()=>{if(request===generation.current)setLoading(false);});
    return()=>{generation.current++;};
  },[page,refresh,context?.funcionario.id,context?.funcionario.versao]);
  return <section className="card space-y-4 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Notificações{data?` (${data.nao_lidas} não lidas)`:''}</h2><button type="button" className="btn-secondary" disabled={loading || !!busy} onClick={()=>setRefresh(n=>n+1)}>Atualizar notificações</button></div>
    {loading && <p role="status">Carregando notificações…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {data && !data.itens.length && <p className="text-sm text-slate-500">Nenhuma notificação disponível.</p>}
    {data && <ul className="divide-y divide-slate-100">{data.itens.map(item=><li key={item.id} className="space-y-2 py-3">
      <p className={item.lida_em?'text-sm text-slate-600':'text-sm font-semibold'}>{item.evento==='etapa_liberada'?'Etapa liberada para execução':'Nova ficha atribuída'} · {isSetor(item.setor)?setores[item.setor]:item.setor}</p>
      <time className="block text-xs text-slate-500" dateTime={item.criada_em}>{new Date(item.criada_em).toLocaleString('pt-BR')}</time>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" onClick={()=>{
        if(selected && !window.confirm('Abrir esta ficha? Alterações não salvas da ficha atual serão descartadas.'))return;
        setSelected(item);
      }}>Abrir ficha relacionada</button>
      {!item.lida_em && <button type="button" className="btn-secondary" disabled={!!busy} onClick={async()=>{
        if(reading.current)return;reading.current=true;setBusy(item.id);setError('');const request=generation.current;
        try{const result=await workNotifications.read(item.id);if(request===generation.current)setData(current=>current?{...current,nao_lidas:Math.max(0,current.nao_lidas-1),itens:current.itens.map(n=>n.id===item.id?{...n,lida_em:result.lida_em}:n)}:current);}
        catch(cause){if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível registrar a leitura.');}
        finally{reading.current=false;setBusy(null);}
      }}>{busy===item.id?'Salvando…':'Marcar como lida'}</button>}</div>
    </li>)}</ul>}
    {data && <div className="flex items-center gap-3"><button type="button" className="btn-secondary" disabled={page===0 || !!busy} onClick={()=>setPage(n=>n-1)}>Anterior</button><span className="text-sm">Página {page+1}</span><button type="button" className="btn-secondary" disabled={!data.tem_mais || !!busy} onClick={()=>setPage(n=>n+1)}>Próxima</button></div>}
    {selected && <ServiceTechnicalSheet key={`${selected.servico_id}:${selected.setor}`} serviceId={selected.servico_id} sector={selected.setor}/>}
  </section>;
}

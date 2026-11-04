import React,{useEffect,useState} from 'react';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {hasPermission} from '../lib/access';
import {agendaService,type AgendaItem} from '../services/agenda.service';
const isoToday=()=>new Date().toISOString().slice(0,10);
export default function AgendaPanel(){
  const {context}=useWorkforceAccess();const allowed=hasPermission(context,'agenda','visualizar');
  const [start,setStart]=useState(isoToday());const [end,setEnd]=useState(()=>new Date(Date.now()+30*86400000).toISOString().slice(0,10));const [items,setItems]=useState<AgendaItem[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  async function load(){if(!allowed)return;if(end<start){setError('O fim do período não pode ser anterior ao início.');return;}setLoading(true);setError('');try{const result=await agendaService.list(start,end);setItems(result.itens);}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível carregar a agenda.');}finally{setLoading(false);}}
  useEffect(()=>{void load();},[allowed,context?.funcionario.id,context?.funcionario.versao]);
  if(!allowed)return null;
  return <section className="card space-y-4 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Agenda de atividades</h2><p className="text-sm text-slate-500">Prazos das tarefas atribuídas a você.</p></div><button type="button" className="btn-secondary" disabled={loading} onClick={()=>void load()}>Atualizar</button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">De<input type="date" className="input-field mt-1" value={start} onChange={event=>setStart(event.target.value)}/></label><label className="text-sm">Até<input type="date" className="input-field mt-1" value={end} onChange={event=>setEnd(event.target.value)}/></label></div>{loading&&<p role="status">Carregando agenda…</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{!loading&&!error&&!items.length&&<p className="text-sm text-slate-500">Nenhuma atividade com prazo neste período.</p>}<ol className="divide-y divide-slate-100">{items.map(item=><li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div><p className="font-medium">{item.titulo}</p><p className="text-sm text-slate-500">{item.descricao}</p></div><time className="text-sm font-semibold text-slate-700" dateTime={item.inicio}>{new Date(item.inicio).toLocaleString('pt-BR')}</time></li>)}</ol></section>;
}

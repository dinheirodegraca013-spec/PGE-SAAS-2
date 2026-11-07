import React,{useEffect,useState} from 'react';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {workTasks,type WorkTask} from '../services/tasks.service';
import {TaskCard} from './MyTasks';
export default function TaskDetails({taskId}:{taskId:string}){
  const {context,loading:accessLoading,error:accessError}=useWorkforceAccess();const [task,setTask]=useState<WorkTask|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [refresh,setRefresh]=useState(0);const [updatedAt,setUpdatedAt]=useState<Date|null>(null);
  useEffect(()=>{setTask(null);setError('');setUpdatedAt(null);},[taskId,context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{let active=true;setLoading(true);setError('');
    if(accessLoading||accessError||!context){setTask(null);setUpdatedAt(null);if(accessError)setError(accessError);setLoading(Boolean(accessLoading));return()=>{active=false;};}
    workTasks.load(taskId).then(result=>{if(active){setTask(result);setUpdatedAt(new Date());}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar a tarefa.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[taskId,refresh,accessLoading,accessError,context?.funcionario.id,context?.funcionario.versao]);
  return <section className="space-y-3" aria-labelledby="task-details-title" aria-busy={loading||accessLoading}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 id="task-details-title" className="break-words font-semibold">Detalhes da tarefa</h3><span className="text-xs text-slate-500" aria-live="polite">{updatedAt?`Atualizada às ${updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando atualização'}</span></div><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={loading||accessLoading} onClick={()=>{if(task&&!window.confirm('Recarregar e descartar alterações não salvas?'))return;setRefresh(n=>n+1);}} aria-label={accessLoading?'Aguardando validação do acesso':loading?(task?'Atualizando tarefa':'Carregando tarefa'):'Recarregar tarefa'}>{accessLoading?'Validando acesso…':loading?(task?'Atualizando…':'Carregando…'):'Recarregar tarefa'}</button></div>{accessLoading&&<p role="status" aria-live="polite">Aguardando validação do acesso…</p>}{loading&&!accessLoading && <p role="status" aria-live="polite">{task ? 'Atualizando tarefa…' : 'Carregando tarefa…'}</p>}{error && <div role="alert" className="flex flex-col gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0 break-words">{error}</span><button type="button" className="w-full shrink-0 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 sm:w-auto" disabled={loading||accessLoading} aria-label={loading||accessLoading?'Atualizando tarefa':'Tentar carregar a tarefa novamente'} onClick={()=>setRefresh(n=>n+1)}>{loading||accessLoading?'Atualizando…':'Tentar novamente'}</button></div>}
    {task && <ul><TaskCard key={`${task.id}:${task.versao}`} task={task} onSaved={()=>setRefresh(n=>n+1)}/></ul>}
  </section>;
}


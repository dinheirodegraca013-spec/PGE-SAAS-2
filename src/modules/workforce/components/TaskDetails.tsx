import React,{useEffect,useState} from 'react';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {workTasks,type WorkTask} from '../services/tasks.service';
import {TaskCard} from './MyTasks';
export default function TaskDetails({taskId}:{taskId:string}){
  const {context}=useWorkforceAccess();const [task,setTask]=useState<WorkTask|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [refresh,setRefresh]=useState(0);const [updatedAt,setUpdatedAt]=useState<Date|null>(null);
  useEffect(()=>{setTask(null);setError('');setUpdatedAt(null);},[taskId,context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{let active=true;setLoading(true);setError('');
    workTasks.load(taskId).then(result=>{if(active){setTask(result);setUpdatedAt(new Date());}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar a tarefa.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[taskId,refresh,context?.funcionario.id,context?.funcionario.versao]);
  return <section className="space-y-3" aria-labelledby="task-details-title" aria-busy={loading}><h3 id="task-details-title" className="font-semibold">Detalhes da tarefa</h3>{loading && <p role="status" aria-live="polite">{task ? 'Atualizando tarefa…' : 'Carregando tarefa…'}</p>}{error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" aria-label="Tentar carregar a tarefa novamente" onClick={()=>setRefresh(n=>n+1)}>Tentar novamente</button></div>}
    <span className="text-xs text-slate-500" aria-live="polite">{updatedAt?`Atualizada às ${updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando atualização'}</span>
    <button type="button" className="btn-secondary" disabled={loading} onClick={()=>{if(task&&!window.confirm('Recarregar e descartar alterações não salvas?'))return;setRefresh(n=>n+1);}} aria-label={loading?(task?'Atualizando tarefa':'Carregando tarefa'):'Recarregar tarefa'}>{loading?(task?'Atualizando…':'Carregando…'):'Recarregar tarefa'}</button>
    {task && <ul><TaskCard key={`${task.id}:${task.versao}`} task={task} onSaved={()=>setRefresh(n=>n+1)}/></ul>}
  </section>;
}

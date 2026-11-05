import React,{useEffect,useRef,useState} from 'react';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {workTasks,type WorkTask} from '../services/tasks.service';
import {TaskCard} from './MyTasks';
export default function TaskDetails({taskId}:{taskId:string}){
  const {context}=useWorkforceAccess();const [task,setTask]=useState<WorkTask|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [refresh,setRefresh]=useState(0);const lastReturnRefresh=useRef(0);
  useEffect(()=>{const refreshOnReturn=()=>{const now=Date.now();if(document.visibilityState==='visible'&&now-lastReturnRefresh.current>1000){lastReturnRefresh.current=now;setRefresh(value=>value+1);}};window.addEventListener('focus',refreshOnReturn);document.addEventListener('visibilitychange',refreshOnReturn);return()=>{window.removeEventListener('focus',refreshOnReturn);document.removeEventListener('visibilitychange',refreshOnReturn);};},[taskId,context?.funcionario.id]);
  useEffect(()=>{let active=true;setLoading(true);setTask(null);setError('');
    workTasks.load(taskId).then(result=>{if(active)setTask(result);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar a tarefa.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[taskId,refresh,context?.funcionario.id,context?.funcionario.versao]);
  return <div className="space-y-3" aria-busy={loading}>{loading && <p role="status" aria-live="polite">Carregando tarefa…</p>}{error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" onClick={()=>setRefresh(n=>n+1)}>Tentar novamente</button></div>}
    <button type="button" className="btn-secondary" disabled={loading} onClick={()=>{if(task&&!window.confirm('Recarregar e descartar alterações não salvas?'))return;setRefresh(n=>n+1);}} aria-label={loading?'Carregando tarefa':'Recarregar tarefa'}>{loading?'Carregando…':'Recarregar tarefa'}</button>
    {task && <ul><TaskCard key={`${task.id}:${task.versao}`} task={task} onSaved={()=>setRefresh(n=>n+1)}/></ul>}
  </div>;
}


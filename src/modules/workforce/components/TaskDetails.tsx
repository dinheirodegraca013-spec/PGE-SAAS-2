import React,{useEffect,useState} from 'react';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {workTasks,type WorkTask} from '../services/tasks.service';
import {TaskCard} from './MyTasks';
export default function TaskDetails({taskId}:{taskId:string}){
  const {context}=useWorkforceAccess();const [task,setTask]=useState<WorkTask|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [refresh,setRefresh]=useState(0);
  useEffect(()=>{let active=true;setLoading(true);setTask(null);setError('');
    workTasks.load(taskId).then(result=>{if(active)setTask(result);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar a tarefa.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[taskId,refresh,context?.funcionario.id,context?.funcionario.versao]);
  return <div className="space-y-3">{loading && <p role="status">Carregando tarefa…</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="button" className="btn-secondary" disabled={loading} onClick={()=>{if(task&&!window.confirm('Recarregar e descartar alterações não salvas?'))return;setRefresh(n=>n+1);}}>Recarregar tarefa</button>
    {task && <ul><TaskCard key={`${task.id}:${task.versao}`} task={task} onSaved={()=>setRefresh(n=>n+1)}/></ul>}
  </div>;
}

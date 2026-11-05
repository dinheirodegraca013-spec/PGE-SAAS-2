import React,{useEffect,useId,useRef,useState} from 'react';
import {isSetor,setores} from '@/lib/setores';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {hasPermission} from '../lib/access';
import {workTasks,taskStatusLabels,type TaskPage,type WorkTask,type TaskStatus} from '../services/tasks.service';

const statusTone: Record<TaskStatus,string> = {
  pendente: 'bg-slate-100 text-slate-700',
  em_andamento: 'bg-cyan-100 text-cyan-800',
  pausada: 'bg-amber-100 text-amber-800',
  aguardando_material: 'bg-orange-100 text-orange-800',
  aguardando_aprovacao: 'bg-violet-100 text-violet-800',
  concluida: 'bg-emerald-100 text-emerald-800',
  cancelada: 'bg-rose-100 text-rose-800',
};

export function TaskCard({task,onSaved}:{task:WorkTask;onSaved:()=>void}){
  const {context}=useWorkforceAccess();const id=useId();
  const [status,setStatus]=useState<TaskStatus>(task.status);
  const [progress,setProgress]=useState(task.progresso);
  const [notes,setNotes]=useState(task.observacoes);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false);
  const final=['concluida','cancelada'].includes(task.status);
  const operation=(target:TaskStatus)=>target===task.status?'editar':target==='em_andamento'?'iniciar':target==='pausada'?'pausar':target==='concluida'?'concluir':target==='cancelada'?'excluir':'editar';
  const options=(Object.keys(taskStatusLabels) as TaskStatus[]).filter(target=>target===task.status ||
    !final && target!=='pendente' && hasPermission(context,'tarefas',operation(target)) &&
    (!['pausada','concluida'].includes(target) || task.status==='em_andamento') &&
    (target!=='cancelada' || !task.obrigatoria || hasPermission(context,'tarefas','aprovar')));
  const overdue=task.prazo && !final && new Date(task.prazo).getTime()<Date.now();
  const displayedStatus=final?task.status:status;
  const displayedProgress=displayedStatus==='concluida'?100:progress;
  const dirty=status!==task.status || progress!==task.progresso || notes!==task.observacoes;
  return <li className="space-y-3 rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{task.titulo}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[displayedStatus]}`}>{taskStatusLabels[displayedStatus]}</span></div>
    <p className="whitespace-pre-wrap text-sm text-slate-600">{task.descricao}</p>
    <p className="text-xs text-slate-500">{isSetor(task.setor)?setores[task.setor]:task.setor} · Prioridade {task.prioridade}{task.obrigatoria?' · Obrigatória para concluir a etapa':''}</p>
    <p className={overdue?'text-sm text-red-700':'text-sm text-slate-500'}>{task.prazo?`${overdue?'Atrasada · ':''}Prazo: ${new Date(task.prazo).toLocaleString('pt-BR')}`:'Sem prazo definido'}</p>
    <progress className="w-full" max={100} value={displayedProgress} aria-label={`Progresso de ${task.titulo}`}/><span className="text-xs" aria-live="polite">{displayedProgress}%</span>
    {final?<p className="whitespace-pre-wrap text-sm text-slate-500">{task.observacoes}</p>:<form className="grid gap-3 sm:grid-cols-2" aria-busy={busy} onSubmit={async event=>{
      event.preventDefault();if(lock.current || !hasPermission(context,'tarefas',operation(status)))return;
      if(!Number.isInteger(progress) || progress<0 || progress>100){setError('Informe um progresso entre 0 e 100.');return;}
      if(status==='cancelada' && notes.trim().length<10){setError('Explique o cancelamento em pelo menos 10 caracteres.');return;}
      if(['concluida','cancelada'].includes(status) && !window.confirm('Finalizar esta tarefa? Ela ficará bloqueada para edição.'))return;
      lock.current=true;setBusy(true);setError('');
      try{await workTasks.update(task,status,progress,notes);onSaved();}
      catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível atualizar a tarefa.');}
      finally{lock.current=false;setBusy(false);}
    }}>
      <label className="text-sm" htmlFor={`${id}-status`}>Situação<select id={`${id}-status`} className="input-field mt-1" disabled={busy} value={status} onChange={event=>setStatus(event.target.value as TaskStatus)}>{options.map(value=><option key={value} value={value}>{taskStatusLabels[value]}</option>)}</select></label>
      <label className="text-sm" htmlFor={`${id}-progress`}>Progresso (%)<input id={`${id}-progress`} className="input-field mt-1" type="number" min={0} max={100} step={1} disabled={busy || status==='concluida'} value={status==='concluida'?100:progress} onChange={event=>setProgress(event.target.value===''?NaN:Number(event.target.value))}/></label>
      <label className="text-sm sm:col-span-2" htmlFor={`${id}-notes`}>Observações ou impedimentos<textarea id={`${id}-notes`} className="input-field mt-1" rows={3} maxLength={10000} disabled={busy} value={notes} onChange={event=>setNotes(event.target.value)}/></label>
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <button type="submit" className="btn-primary" disabled={busy || !dirty || !hasPermission(context,'tarefas',operation(status))} aria-label={busy?'Salvando tarefa':dirty?'Atualizar tarefa':'Sem alterações'}>{busy?'Salvando…':dirty?'Atualizar tarefa':'Sem alterações'}</button>
    </form>}
  </li>;
}

export default function MyTasks(){
  const {context}=useWorkforceAccess();const [data,setData]=useState<TaskPage|null>(null);const [page,setPage]=useState(0);const [filter,setFilter]=useState<TaskStatus|''>('');const [refresh,setRefresh]=useState(0);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [updatedAt,setUpdatedAt]=useState<Date|null>(null);const id=useId();const lastReturnRefresh=useRef(0);
  useEffect(()=>{const refreshOnReturn=()=>{const now=Date.now();if(document.visibilityState==='visible'&&now-lastReturnRefresh.current>1000){lastReturnRefresh.current=now;setRefresh(value=>value+1);}};window.addEventListener('focus',refreshOnReturn);document.addEventListener('visibilitychange',refreshOnReturn);return()=>{window.removeEventListener('focus',refreshOnReturn);document.removeEventListener('visibilitychange',refreshOnReturn);};},[context?.funcionario.id]);
  useEffect(()=>{let active=true;setLoading(true);setError('');setData(null);setUpdatedAt(null);
    workTasks.list(page,filter||null).then(result=>{if(active){setData(result);setUpdatedAt(new Date());}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar as tarefas.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[page,filter,refresh,context?.funcionario.id,context?.funcionario.versao]);
  return <section className="card space-y-4 p-5" aria-busy={loading}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Minhas tarefas</h2><span className="text-xs text-slate-500" aria-live="polite">{updatedAt?`Última atualização às ${updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando atualização'}</span></div>
    <label htmlFor={id} className="block text-sm">Filtrar por situação<select id={id} className="input-field mt-1" disabled={loading} value={filter} onChange={event=>{setFilter(event.target.value as TaskStatus|'');setPage(0);}}><option value="">Todas as situações</option>{Object.entries(taskStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <button type="button" className="btn-secondary" disabled={loading} onClick={()=>setRefresh(n=>n+1)} aria-label={loading?'Atualizando tarefas':'Atualizar tarefas'}>{loading?'Atualizando…':'Atualizar tarefas'}</button>
    {loading && <p role="status" aria-live="polite">Carregando tarefas…</p>}{error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" onClick={()=>setRefresh(n=>n+1)}>Tentar novamente</button></div>}
    {data && !data.itens.length && <p className="text-sm text-slate-500">Nenhuma tarefa disponível neste filtro.</p>}
    {data && <ul className="space-y-4">{data.itens.map(task=><TaskCard key={`${task.id}:${task.versao}`} task={task} onSaved={()=>setRefresh(n=>n+1)}/>)}</ul>}
    {data && <nav aria-label="Paginação de tarefas" className="flex items-center gap-3"><button type="button" className="btn-secondary" disabled={loading || page===0} onClick={()=>setPage(n=>n-1)}>Anterior</button><span className="text-sm" aria-current="page">Página {page+1}</span><button type="button" className="btn-secondary" disabled={loading || !data.tem_mais} onClick={()=>setPage(n=>n+1)}>Próxima</button></nav>}
  </section>;
}


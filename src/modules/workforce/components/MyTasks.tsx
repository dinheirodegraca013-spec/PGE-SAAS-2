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
const priorityLabels={baixa:'Baixa',normal:'Normal',alta:'Alta',urgente:'Urgente'};
const priorityTone={baixa:'bg-slate-100 text-slate-700',normal:'bg-cyan-100 text-cyan-800',alta:'bg-amber-100 text-amber-800',urgente:'bg-rose-100 text-rose-800'};
const workforceRefreshEvent='gestio:refresh-workforce';
const taskFilterEvent='gestio:filter-workforce-tasks';
const formatTaskStatus=(value:string)=>taskStatusLabels[value as TaskStatus]??'Situação indisponível';
const taskTone=(value:string)=>statusTone[value as TaskStatus]??'bg-slate-100 text-slate-700';
const formatPriority=(value:string)=>priorityLabels[value as keyof typeof priorityLabels]??'Não informada';
const priorityBadgeTone=(value:string)=>priorityTone[value as keyof typeof priorityTone]??'bg-slate-100 text-slate-700';
const formatTaskSector=(value:string)=>isSetor(value)?setores[value]:(value||'Setor não informado');
function formatTaskDeadline(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Prazo não informado':date.toLocaleString('pt-BR');}
function safeTaskDateTime(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?undefined:date.toISOString();}
function deadlineHint(value:string){const date=new Date(value);if(Number.isNaN(date.getTime()))return null;const today=new Date();today.setHours(0,0,0,0);date.setHours(0,0,0,0);const days=Math.round((date.getTime()-today.getTime())/86400000);return days<0?'Atrasada':days===0?'Vence hoje':days===1?'Vence amanhã':days<=7?`Vence em ${days} dias`:null;}

export function TaskCard({task,onSaved}:{task:WorkTask;onSaved:()=>void}){
  const {context}=useWorkforceAccess();const id=useId();
  const [status,setStatus]=useState<TaskStatus>(task.status);
  const [progress,setProgress]=useState(task.progresso);
  const [notes,setNotes]=useState(task.observacoes);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false);
  const clearError=()=>setError('');
  const final=['concluida','cancelada'].includes(task.status);
  const operation=(target:TaskStatus)=>target===task.status?'editar':target==='em_andamento'?'iniciar':target==='pausada'?'pausar':target==='concluida'?'concluir':target==='cancelada'?'excluir':'editar';
  const options=(Object.keys(taskStatusLabels) as TaskStatus[]).filter(target=>target===task.status ||
    !final && target!=='pendente' && hasPermission(context,'tarefas',operation(target)) &&
    (!['pausada','concluida'].includes(target) || task.status==='em_andamento') &&
    (target!=='cancelada' || !task.obrigatoria || hasPermission(context,'tarefas','aprovar')));
  const displayedStatus=final?task.status:status;
  const overdue=task.prazo && !['concluida','cancelada'].includes(displayedStatus) && new Date(task.prazo).getTime()<Date.now();
  const dueHint=task.prazo && !['concluida','cancelada'].includes(displayedStatus)?deadlineHint(task.prazo):null;
  const displayedProgress=displayedStatus==='concluida'?100:progress;
  const safeDisplayedProgress=Number.isFinite(displayedProgress)?Math.min(100,Math.max(0,displayedProgress)):0;
  const dirty=status!==task.status || progress!==task.progresso || notes!==task.observacoes;
  return <li id={`tarefa-${task.id}`} className={`scroll-mt-4 space-y-3 rounded-xl border p-4 ${overdue?'border-rose-200 bg-rose-50/40':'border-slate-200'}`} aria-label={`Tarefa ${task.titulo} · ${formatTaskStatus(displayedStatus)} · ${formatTaskSector(task.setor)} · Prioridade ${formatPriority(task.prioridade)} · ${task.prazo?`Prazo ${formatTaskDeadline(task.prazo)}`:'Sem prazo'}${overdue?' · Atrasada':''}`}>
    <div className="flex flex-wrap justify-between gap-2"><h3 className="min-w-0 break-words font-semibold">{task.titulo}</h3><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${taskTone(displayedStatus)}`}>{formatTaskStatus(displayedStatus)}</span></div>
    <p className="break-words whitespace-pre-wrap text-sm text-slate-600">{task.descricao}</p>
    <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="break-words">{formatTaskSector(task.setor)}</span><span className={`shrink-0 rounded-full px-2 py-1 font-semibold ${priorityBadgeTone(task.prioridade)}`}>Prioridade {formatPriority(task.prioridade)}</span>{task.obrigatoria&&<span className="break-words">Obrigatória para concluir a etapa</span>}</p>
    <p className={overdue?'flex flex-wrap items-center gap-2 text-sm text-red-700':dueHint?'flex flex-wrap items-center gap-2 text-sm text-amber-700':'text-sm text-slate-500'}>{task.prazo?<>{dueHint&&<span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${overdue?'bg-rose-100 text-rose-800':'bg-amber-100 text-amber-800'}`}>{dueHint}</span>}<span className="break-words">Prazo: <time dateTime={safeTaskDateTime(task.prazo)}>{formatTaskDeadline(task.prazo)}</time></span></>:'Sem prazo definido'}</p>
    <progress className="w-full" max={100} value={safeDisplayedProgress} aria-label={`Progresso de ${task.titulo}`} aria-valuetext={`${safeDisplayedProgress}% concluído`}/><span className="text-xs" aria-live="polite">{safeDisplayedProgress}%</span>
    {final?<p className="break-words whitespace-pre-wrap text-sm text-slate-500">{task.observacoes}</p>:<form className="grid gap-3 sm:grid-cols-2" aria-busy={busy} onSubmit={async event=>{
      event.preventDefault();if(lock.current || !hasPermission(context,'tarefas',operation(status)))return;
      if(!Number.isInteger(progress) || progress<0 || progress>100){setError('Informe um progresso entre 0 e 100.');return;}
      if(status==='cancelada' && notes.trim().length<10){setError('Explique o cancelamento em pelo menos 10 caracteres.');return;}
      if(['concluida','cancelada'].includes(status) && !window.confirm('Finalizar esta tarefa? Ela ficará bloqueada para edição.'))return;
      lock.current=true;setBusy(true);setError('');
      try{await workTasks.update(task,status,progress,notes);onSaved();}
      catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível atualizar a tarefa.');}
      finally{lock.current=false;setBusy(false);}
    }}>
      <label className="text-sm" htmlFor={`${id}-status`}>Situação<select id={`${id}-status`} className="input-field mt-1" disabled={busy} value={status} onChange={event=>{setStatus(event.target.value as TaskStatus);clearError();}}>{options.map(value=><option key={value} value={value}>{taskStatusLabels[value]}</option>)}</select></label>
      <label className="text-sm" htmlFor={`${id}-progress`}>Progresso (%)<input id={`${id}-progress`} className="input-field mt-1" type="number" inputMode="numeric" required min={0} max={100} step={1} aria-describedby={`${id}-progress-help`} disabled={busy || status==='concluida'} value={status==='concluida'?100:Number.isFinite(progress)?progress:''} onChange={event=>{setProgress(event.target.value===''?NaN:Number(event.target.value));clearError();}}/><span id={`${id}-progress-help`} className="mt-1 block text-xs text-slate-500">Informe um valor inteiro entre 0 e 100.</span></label>
      <label className="text-sm sm:col-span-2" htmlFor={`${id}-notes`}>Observações ou impedimentos<textarea id={`${id}-notes`} className="input-field mt-1" aria-describedby={`${id}-notes-help`} rows={3} maxLength={10000} disabled={busy} value={notes} onChange={event=>{setNotes(event.target.value);clearError();}}/><span id={`${id}-notes-help`} className="mt-1 block text-xs text-slate-500">{status==='cancelada'?'Explique o cancelamento com pelo menos 10 caracteres.':'Registre impedimentos ou informações relevantes para a equipe.'}</span></label>
      {error && <p role="alert" className="break-words text-sm text-red-700 sm:col-span-2">{error}</p>}{busy && <p role="status" aria-live="polite" className="text-sm text-cyan-700 sm:col-span-2">Salvando tarefa…</p>}
      <button type="submit" className="btn-primary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={busy || !dirty || !hasPermission(context,'tarefas',operation(status))} aria-label={busy?'Salvando tarefa':dirty?'Atualizar tarefa':'Sem alterações'}>{busy?'Salvando…':dirty?'Atualizar tarefa':'Sem alterações'}</button>
    </form>}
  </li>;
}

export default function MyTasks(){
  const {context,loading:accessLoading,error:accessError}=useWorkforceAccess();const [data,setData]=useState<TaskPage|null>(null);const [page,setPage]=useState(0);const [filter,setFilter]=useState<TaskStatus|''>('');const [refresh,setRefresh]=useState(0);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [updatedAt,setUpdatedAt]=useState<Date|null>(null);const id=useId();const lastReturnRefresh=useRef(0);
  useEffect(()=>{setPage(0);setFilter('');},[context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{setData(null);setUpdatedAt(null);},[page,filter,context?.funcionario.id,context?.funcionario.versao,accessError]);
  useEffect(()=>{const refreshOnReturn=()=>{const now=Date.now();if(document.visibilityState==='visible'&&now-lastReturnRefresh.current>1000){lastReturnRefresh.current=now;setRefresh(value=>value+1);}};window.addEventListener('focus',refreshOnReturn);document.addEventListener('visibilitychange',refreshOnReturn);return()=>{window.removeEventListener('focus',refreshOnReturn);document.removeEventListener('visibilitychange',refreshOnReturn);};},[context?.funcionario.id]);
  useEffect(()=>{const refreshPanel=()=>setRefresh(value=>value+1);window.addEventListener(workforceRefreshEvent,refreshPanel);return()=>window.removeEventListener(workforceRefreshEvent,refreshPanel);},[]);
  useEffect(()=>{const applyFilter=(event:Event)=>{const status=(event as CustomEvent<{status?:unknown}>).detail?.status;if(typeof status!=='string'||!(status in taskStatusLabels))return;setFilter(status as TaskStatus);setPage(0);};window.addEventListener(taskFilterEvent,applyFilter);return()=>window.removeEventListener(taskFilterEvent,applyFilter);},[]);
  useEffect(()=>{let active=true;setLoading(true);setError('');
    if(accessLoading){setData(null);setUpdatedAt(null);return()=>{active=false;};}
    if(accessError||!context){setData(null);setUpdatedAt(null);setLoading(false);return()=>{active=false;};}
    workTasks.list(page,filter||null).then(result=>{if(active){setData(result);setUpdatedAt(new Date());}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar as tarefas.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[page,filter,refresh,accessLoading,accessError,context?.funcionario.id,context?.funcionario.versao]);
  return <section className="card space-y-4 p-5" aria-labelledby="my-tasks-title" aria-busy={loading}><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="my-tasks-title" className="min-w-0 break-words text-lg font-bold">Minhas tarefas</h2><span className="shrink-0 text-xs text-slate-500" aria-live="polite">{updatedAt?`Última atualização às ${updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando atualização'}</span></div>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label htmlFor={id} className="block text-sm">Filtrar por situação<select id={id} className="input-field mt-1" disabled={loading} value={filter} onChange={event=>{setFilter(event.target.value as TaskStatus|'');setPage(0);}}><option value="">Todas as situações</option>{Object.entries(taskStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{filter&&<button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={loading} onClick={()=>{setFilter('');setPage(0);}} aria-label="Limpar filtro de tarefas">Limpar filtro</button>}<button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={loading} onClick={()=>setRefresh(n=>n+1)} aria-label={loading?'Atualizando tarefas':'Atualizar tarefas'}>{loading?'Atualizando…':'Atualizar tarefas'}</button></div></div>
    {data&&!loading&&<p className="text-xs text-slate-500" role="status" aria-live="polite">{data.itens.length} {data.itens.length===1?'tarefa visível':'tarefas visíveis'} nesta página{data.tem_mais?' · Há mais tarefas disponíveis.':''}</p>}
    {loading && <p role="status" aria-live="polite">{data ? 'Atualizando tarefas…' : 'Carregando tarefas…'}</p>}{error && <div role="alert" className="flex flex-col gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0 break-words">{error}</span><button type="button" className="w-full shrink-0 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 sm:w-auto" disabled={loading} aria-label={loading?'Atualizando tarefas':'Tentar carregar as tarefas novamente'} onClick={()=>setRefresh(n=>n+1)}>{loading?'Atualizando…':'Tentar novamente'}</button></div>}
    {data && !data.itens.length && <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="min-w-0 break-words text-sm text-slate-500">{filter?`Nenhuma tarefa com situação “${formatTaskStatus(filter)}”${page>0?' nesta página':''}.`:page>0?'Nenhuma tarefa nesta página. Volte uma página para consultar resultados anteriores.':'Nenhuma tarefa disponível no momento.'}</p>{filter&&<button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={loading} onClick={()=>{setFilter('');setPage(0);}}>Limpar filtro</button>}</div>}
    {data && <ul className="space-y-4">{data.itens.map(task=><TaskCard key={`${task.id}:${task.versao}`} task={task} onSaved={()=>setRefresh(n=>n+1)}/>)}</ul>}
    {data && (data.itens.length || page>0 || data.tem_mais) && <nav aria-label="Paginação de tarefas" className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Ir para a página anterior de tarefas" disabled={loading || page===0} onClick={()=>setPage(n=>n-1)}>Anterior</button><span className="shrink-0 text-center text-sm sm:text-left" aria-current="page" aria-live="polite">Página {page+1}</span><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Ir para a próxima página de tarefas" disabled={loading || !data.tem_mais} onClick={()=>setPage(n=>n+1)}>Próxima</button></nav>}
  </section>;
}

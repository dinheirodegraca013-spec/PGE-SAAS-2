import React,{useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {hasPermission} from '../lib/access';
import {isSetor} from '@/lib/setores';
type Summary={tarefas:{total:number;pendentes:number;em_andamento:number;concluidas:number;atrasadas:number;aguardando_material:number;aguardando_aprovacao:number};ordens_em_execucao:number;proximos_prazos:{id:string;titulo:string;setor:string;prazo:string}[]};
const workforceRefreshEvent='gestio:refresh-workforce';
const taskFilterEvent='gestio:filter-workforce-tasks';
const isCount=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
function normalizeSummary(value:unknown):Summary|null{
  if(!value||typeof value!=='object')return null;
  const source=value as Record<string,unknown>;const rawTasks=source.tarefas;
  if(!rawTasks||typeof rawTasks!=='object')return null;
  const tasks=rawTasks as Record<string,unknown>;const taskKeys=['total','pendentes','em_andamento','concluidas','atrasadas','aguardando_material','aguardando_aprovacao'];
  if(!taskKeys.every(key=>isCount(tasks[key]))||!isCount(source.ordens_em_execucao)||!Array.isArray(source.proximos_prazos))return null;
  const proximos_prazos=source.proximos_prazos.map(item=>{if(!item||typeof item!=='object'||Array.isArray(item))return null;const row=item as Record<string,unknown>;if(typeof row.id!=='string'||!row.id||typeof row.titulo!=='string'||!row.titulo||typeof row.setor!=='string'||!isSetor(row.setor)||typeof row.prazo!=='string'||!row.prazo||!Number.isFinite(new Date(row.prazo).getTime()))return null;return{id:row.id,titulo:row.titulo,setor:row.setor,prazo:row.prazo};});
  if(proximos_prazos.some(item=>item===null))return null;
  const validPrazos=proximos_prazos as Summary['proximos_prazos'];
  if(new Set(validPrazos.map(item=>item.id)).size!==validPrazos.length)return null;
  validPrazos.sort((left,right)=>new Date(left.prazo).getTime()-new Date(right.prazo).getTime());
  return{tarefas:{total:tasks.total as number,pendentes:tasks.pendentes as number,em_andamento:tasks.em_andamento as number,concluidas:tasks.concluidas as number,atrasadas:tasks.atrasadas as number,aguardando_material:tasks.aguardando_material as number,aguardando_aprovacao:tasks.aguardando_aprovacao as number},ordens_em_execucao:source.ordens_em_execucao as number,proximos_prazos:validPrazos};
}
function cardTone(label:string){
  if(label==='Atrasadas')return 'border-rose-200 bg-rose-50';
  if(label==='Concluídas')return 'border-emerald-200 bg-emerald-50';
  if(label==='Em andamento'||label==='Serviços em execução')return 'border-cyan-200 bg-cyan-50';
  if(label.startsWith('Aguardando'))return 'border-amber-200 bg-amber-50';
  return 'border-slate-200 bg-white';
}
function formatDeadline(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Prazo não informado':date.toLocaleString('pt-BR');}
function safeDateTime(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?undefined:date.toISOString();}
function deadlineStatus(value:string){const date=new Date(value);if(Number.isNaN(date.getTime()))return null;const today=new Date();today.setHours(0,0,0,0);date.setHours(0,0,0,0);const difference=Math.round((date.getTime()-today.getTime())/86400000);return difference<0?'Atrasado':difference===0?'Vence hoje':difference===1?'Vence amanhã':difference<=7?`Vence em ${difference} dias`:null;}
function focusTask(taskId:string){const target=document.getElementById(`tarefa-${taskId}`);if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({behavior:'smooth',block:'center'});return;}const list=document.getElementById('tarefas');if(list){list.setAttribute('tabindex','-1');list.focus({preventScroll:true});list.scrollIntoView({behavior:'smooth',block:'start'});}}
function focusTaskList(event?:React.MouseEvent<HTMLAnchorElement>){const filter=event?.currentTarget.dataset.taskFilter;if(filter)window.dispatchEvent(new CustomEvent(taskFilterEvent,{detail:{status:filter}}));const list=document.getElementById('tarefas');if(list){list.setAttribute('tabindex','-1');list.focus({preventScroll:true});list.scrollIntoView({behavior:'smooth',block:'start'});}}
function taskFilterForLabel(label:string){return ({'Pendentes':'pendente','Em andamento':'em_andamento','Concluídas':'concluida','Aguardando material':'aguardando_material','Aguardando aprovação':'aguardando_aprovacao'} as Record<string,string>)[label]||'';}
function isTaskCard(label:string){return label!=='Serviços em execução';}
export default function PersonalWorkSummary(){
  const {context,loading:accessLoading,error:accessError}=useWorkforceAccess();const [summary,setSummary]=useState<Summary|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [retry,setRetry]=useState(0);const [updatedAt,setUpdatedAt]=useState<Date|null>(null);const lastReturnRefresh=useRef(0);
  useEffect(()=>{const refreshOnReturn=()=>{const now=Date.now();if(document.visibilityState==='visible'&&now-lastReturnRefresh.current>1000){lastReturnRefresh.current=now;setRetry(value=>value+1);}};window.addEventListener('focus',refreshOnReturn);document.addEventListener('visibilitychange',refreshOnReturn);return()=>{window.removeEventListener('focus',refreshOnReturn);document.removeEventListener('visibilitychange',refreshOnReturn);};},[context?.funcionario.id]);
  useEffect(()=>{const refreshPanel=()=>setRetry(value=>value+1);window.addEventListener(workforceRefreshEvent,refreshPanel);return()=>window.removeEventListener(workforceRefreshEvent,refreshPanel);},[]);
  useEffect(()=>{setSummary(null);setError('');setUpdatedAt(null);},[context?.funcionario.id,context?.funcionario.versao,accessError]);
  useEffect(()=>{let active=true;setLoading(true);setError('');
    if(accessLoading){setSummary(null);setUpdatedAt(null);return()=>{active=false;};}
    if(accessError||!context){setSummary(null);setUpdatedAt(null);setLoading(false);return()=>{active=false;};}
    Promise.resolve().then(()=>supabase.rpc('meu_resumo_operacional')).then(({data,error})=>{if(!active)return;if(error || !data){setError(error?.message||'Não foi possível carregar os indicadores.');return;}const normalized=normalizeSummary(data);if(!normalized){setError('Os indicadores retornaram dados inválidos.');return;}setSummary(normalized);setUpdatedAt(new Date());})
      .catch(()=>{if(active)setError('Não foi possível carregar os indicadores.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[accessLoading,accessError,context?.funcionario.id,context?.funcionario.versao,retry]);
  const cards=summary?[
    ...(hasPermission(context,'tarefas')?[
      ['Tarefas atribuídas',summary.tarefas.total],['Pendentes',summary.tarefas.pendentes],['Em andamento',summary.tarefas.em_andamento],
      ['Concluídas',summary.tarefas.concluidas],['Atrasadas',summary.tarefas.atrasadas],['Aguardando material',summary.tarefas.aguardando_material],['Aguardando aprovação',summary.tarefas.aguardando_aprovacao],
    ]:[]),...(hasPermission(context,'ordens')?[['Serviços em execução',summary.ordens_em_execucao]]:[]),
  ]:[];
  if(!loading&&!error&&!cards.length)return <section className="card p-4" aria-labelledby="personal-work-summary-empty-title" aria-live="polite"><h2 id="personal-work-summary-empty-title" className="font-semibold">Meu trabalho hoje</h2><p className="mt-2 text-sm text-slate-500">Nenhum indicador está disponível para as permissões atuais.</p></section>;
  return <section className="space-y-4" aria-labelledby="personal-work-summary-title" aria-busy={loading}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="personal-work-summary-title" className="text-lg font-bold">Meu trabalho hoje</h2><span className="text-xs text-slate-500" aria-live="polite">{updatedAt?`Atualizado às ${updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando atualização'}</span></div><button type="button" className="btn-secondary" disabled={loading} onClick={()=>setRetry(n=>n+1)} aria-label={loading?'Atualizando indicadores':'Atualizar indicadores'}>{loading?'Atualizando…':'Atualizar indicadores'}</button></div>
    {loading && <p role="status" aria-live="polite">{summary ? 'Atualizando indicadores…' : 'Carregando indicadores…'}</p>}{error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700"><span className="min-w-0 break-words">{error}</span><button type="button" className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" aria-label="Tentar carregar os indicadores novamente" onClick={()=>setRetry(n=>n+1)}>Tentar novamente</button></div>}
    {summary && <><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label,value])=>{const safeValue=Number.isFinite(Number(value))?value:0;const taskFilter=taskFilterForLabel(String(label));const card=<div key={label} role="group" className={`card border p-4 ${cardTone(String(label))}`} aria-label={`${label}: ${Number.isFinite(Number(value))?value:0}`}><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{safeValue}</p></div>;return isTaskCard(String(label))?<a key={`${label}-link`} href="#tarefas" data-task-filter={taskFilter||undefined} onClick={focusTaskList} aria-label={`${taskFilter?'Filtrar minhas tarefas por ': 'Abrir minhas tarefas: '}${label}`} className="rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500">{card}</a>:card;})}</div>
      {hasPermission(context,'tarefas') && <section className="card p-4" aria-labelledby="personal-work-deadlines-title"><h3 id="personal-work-deadlines-title" className="font-semibold">Próximos prazos</h3>{!summary.proximos_prazos.length?<p role="status" aria-live="polite" className="mt-2 text-sm text-slate-500">Nenhuma tarefa com prazo pendente.</p>:<ul className="divide-y divide-slate-100">{summary.proximos_prazos.map(task=>{const status=deadlineStatus(task.prazo);return <li key={task.id} className="py-3 text-sm"><a href={`#tarefa-${task.id}`} aria-label={`Abrir a tarefa ${task.titulo}${status?` · ${status}`:''}`} onClick={()=>focusTask(task.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"><span className="min-w-0 break-words">{task.titulo}</span><span className="flex shrink-0 flex-wrap items-center justify-end gap-2"><time className={status==='Atrasado'?'font-semibold text-rose-700':status?'font-semibold text-amber-700':'text-slate-600'} dateTime={safeDateTime(task.prazo)}>{formatDeadline(task.prazo)}</time>{status&&<span className={`rounded-full px-2 py-1 text-xs font-semibold ${status==='Atrasado'?'bg-rose-100 text-rose-800':'bg-amber-100 text-amber-800'}`}>{status}</span>}</span></a></li>;})}</ul>}</section>}
    </>}
  </section>;
}

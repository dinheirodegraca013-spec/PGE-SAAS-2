import React,{useEffect,useId,useRef,useState} from 'react';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {hasPermission} from '../lib/access';
import {technicalSheets} from '../services/technical-sheet.service';
import {workTasks,type WorkTask} from '../services/tasks.service';
const priorityLabels={baixa:'Baixa',normal:'Normal',alta:'Alta',urgente:'Urgente'};

export default function TaskCreationForm({serviceId,sector}:{serviceId:string;sector:string}){
  const {context}=useWorkforceAccess();const id=useId();
  const [title,setTitle]=useState('');const [description,setDescription]=useState('');
  const [employee,setEmployee]=useState('');const [deadline,setDeadline]=useState('');
  const [priority,setPriority]=useState<WorkTask['prioridade']>('normal');const [mandatory,setMandatory]=useState(false);
  const [candidates,setCandidates]=useState<{id:string;nome:string}[]>([]);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [retry,setRetry]=useState(0);
  const lock=useRef(false);const receipt=useRef<{payload:string;id:string}|null>(null);
  const canCreate=hasPermission(context,'tarefas','criar');
  const clearFeedback=()=>{setError('');setMessage('');};
  useEffect(()=>{setCandidates([]);setEmployee('');setTitle('');setDescription('');setDeadline('');setPriority('normal');setMandatory(false);receipt.current=null;},[serviceId,sector,canCreate,context?.proprietario,context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{
    if(!canCreate || !context)return;
    let active=true;setLoading(true);setError('');setMessage('');
    const load=context.proprietario?technicalSheets.candidates(serviceId,sector):Promise.resolve([{id:context.funcionario.id,nome:context.funcionario.nome}]);
    load.then(items=>{if(active)setCandidates(items);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar os responsáveis.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[serviceId,sector,canCreate,context?.proprietario,context?.funcionario.id,context?.funcionario.versao,retry]);
  if(!canCreate)return null;
  return <form className="space-y-3 rounded-xl border border-slate-200 p-4" aria-busy={loading || busy} onSubmit={async event=>{
    event.preventDefault();if(lock.current || loading)return;
    if(!title.trim() || !candidates.some(item=>item.id===employee)){setError('Informe o título e escolha um responsável disponível.');return;}
    if(description.trim().length<2){setError('Informe uma descrição com pelo menos 2 caracteres.');return;}
    const parsed=deadline?new Date(deadline):null;
    if(parsed && !Number.isFinite(parsed.getTime())){setError('Informe um prazo válido.');return;}
    const input={sector,title:title.trim(),description,employee,service:serviceId,deadline:parsed?.toISOString()||null,priority,mandatory};
    const payload=JSON.stringify(input);
    if(receipt.current?.payload!==payload)receipt.current={payload,id:crypto.randomUUID()};
    lock.current=true;setBusy(true);setError('');setMessage('');
    try{await workTasks.create({...input,request:receipt.current.id});setTitle('');setDescription('');setDeadline('');setMandatory(false);receipt.current=null;setMessage('Tarefa criada e atribuída ao funcionário.');}
    catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível criar a tarefa.');}
    finally{lock.current=false;setBusy(false);}
  }}>
    <h4 className="font-semibold">Criar tarefa nesta etapa</h4>
    <fieldset disabled={busy || loading} className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">Dados da nova tarefa</legend>
      <label className="text-sm sm:col-span-2" htmlFor={`${id}-title`}>Título<input id={`${id}-title`} className="input-field mt-1" required minLength={2} maxLength={200} value={title} onChange={event=>{setTitle(event.target.value);setError('');setMessage('');}}/></label>
      <label className="text-sm sm:col-span-2" htmlFor={`${id}-description`}>Descrição<textarea id={`${id}-description`} className="input-field mt-1" rows={3} minLength={2} maxLength={10000} required value={description} onChange={event=>{setDescription(event.target.value);clearFeedback();}}/></label>
      <label className="text-sm" htmlFor={`${id}-employee`}>Responsável<select id={`${id}-employee`} className="input-field mt-1" required value={employee} onChange={event=>{setEmployee(event.target.value);setError('');setMessage('');}}><option value="">Selecione um funcionário</option>{candidates.map(item=><option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
      <label className="text-sm" htmlFor={`${id}-deadline`}>Prazo (horário local)<input id={`${id}-deadline`} className="input-field mt-1" type="datetime-local" autoComplete="off" aria-describedby={`${id}-deadline-help`} value={deadline} onChange={event=>{setDeadline(event.target.value);clearFeedback();}}/><span id={`${id}-deadline-help`} className="mt-1 block text-xs text-slate-500">O horário será salvo conforme o fuso local deste dispositivo.</span></label>
      <label className="text-sm" htmlFor={`${id}-priority`}>Prioridade<select id={`${id}-priority`} className="input-field mt-1" value={priority} onChange={event=>{setPriority(event.target.value as WorkTask['prioridade']);clearFeedback();}}>{(Object.keys(priorityLabels) as WorkTask['prioridade'][]).map(value=><option key={value} value={value}>{priorityLabels[value]}</option>)}</select></label>
      <label htmlFor={`${id}-mandatory`} className="flex items-center gap-2 text-sm"><input id={`${id}-mandatory`} type="checkbox" checked={mandatory} onChange={event=>{setMandatory(event.target.checked);clearFeedback();}}/>Obrigatória para concluir a etapa</label>
    </fieldset>
    {loading && <p role="status" aria-live="polite" className="text-sm">{candidates.length ? 'Atualizando responsáveis…' : 'Carregando responsáveis…'}</p>}
    {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
    {message && <p role="status" aria-live="polite" className="text-sm">{message}</p>}
    {!loading && !error && !candidates.length && <p role="status" aria-live="polite" className="text-sm text-amber-700">Nenhum funcionário autorizado está disponível para receber esta tarefa.</p>}
    {!loading && (error || !candidates.length) && <button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={busy} onClick={()=>{setError('');setMessage('');setRetry(n=>n+1)}} aria-label={busy?'Aguarde a criação da tarefa':'Tentar carregar responsáveis novamente'}>{busy?'Aguarde…':'Atualizar responsáveis'}</button>}
    <button type="submit" className="btn-primary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={busy || loading || !candidates.length} aria-label={loading?'Carregando responsáveis':busy?'Criando tarefa':'Criar tarefa'}>{loading?'Carregando…':busy?'Criando…':'Criar tarefa'}</button>
  </form>;
}

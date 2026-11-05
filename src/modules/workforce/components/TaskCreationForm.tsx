import React,{useEffect,useId,useRef,useState} from 'react';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {hasPermission} from '../lib/access';
import {technicalSheets} from '../services/technical-sheet.service';
import {workTasks,type WorkTask} from '../services/tasks.service';

export default function TaskCreationForm({serviceId,sector}:{serviceId:string;sector:string}){
  const {context}=useWorkforceAccess();const id=useId();
  const [title,setTitle]=useState('');const [description,setDescription]=useState('');
  const [employee,setEmployee]=useState('');const [deadline,setDeadline]=useState('');
  const [priority,setPriority]=useState<WorkTask['prioridade']>('normal');const [mandatory,setMandatory]=useState(false);
  const [candidates,setCandidates]=useState<{id:string;nome:string}[]>([]);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [retry,setRetry]=useState(0);
  const lock=useRef(false);const receipt=useRef<{payload:string;id:string}|null>(null);
  const canCreate=hasPermission(context,'tarefas','criar');
  useEffect(()=>{
    if(!canCreate || !context)return;
    let active=true;setLoading(true);setError('');setCandidates([]);setEmployee('');
    const load=context.proprietario?technicalSheets.candidates(serviceId,sector):Promise.resolve([{id:context.funcionario.id,nome:context.funcionario.nome}]);
    load.then(items=>{if(active)setCandidates(items);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar os responsáveis.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[serviceId,sector,canCreate,context?.proprietario,context?.funcionario.id,context?.funcionario.versao,retry]);
  if(!canCreate)return null;
  return <form className="space-y-3 rounded-xl border border-slate-200 p-4" aria-busy={loading || busy} onSubmit={async event=>{
    event.preventDefault();if(lock.current || loading)return;
    if(!title.trim() || !candidates.some(item=>item.id===employee)){setError('Informe o título e escolha um responsável disponível.');return;}
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
    <fieldset disabled={busy || loading} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2" htmlFor={`${id}-title`}>Título<input id={`${id}-title`} className="input-field mt-1" required maxLength={200} value={title} onChange={event=>setTitle(event.target.value)}/></label>
      <label className="text-sm sm:col-span-2" htmlFor={`${id}-description`}>Descrição<textarea id={`${id}-description`} className="input-field mt-1" rows={3} maxLength={10000} value={description} onChange={event=>setDescription(event.target.value)}/></label>
      <label className="text-sm" htmlFor={`${id}-employee`}>Responsável<select id={`${id}-employee`} className="input-field mt-1" required value={employee} onChange={event=>setEmployee(event.target.value)}><option value="">Selecione um funcionário</option>{candidates.map(item=><option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
      <label className="text-sm" htmlFor={`${id}-deadline`}>Prazo (horário local)<input id={`${id}-deadline`} className="input-field mt-1" type="datetime-local" value={deadline} onChange={event=>setDeadline(event.target.value)}/></label>
      <label className="text-sm" htmlFor={`${id}-priority`}>Prioridade<select id={`${id}-priority`} className="input-field mt-1" value={priority} onChange={event=>setPriority(event.target.value as WorkTask['prioridade'])}>{['baixa','normal','alta','urgente'].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mandatory} onChange={event=>setMandatory(event.target.checked)}/>Obrigatória para concluir a etapa</label>
    </fieldset>
    {loading && <p role="status" aria-live="polite" className="text-sm">Carregando responsáveis…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" aria-live="polite" className="text-sm">{message}</p>}
    {!loading && !candidates.length && <button type="button" className="btn-secondary" onClick={()=>setRetry(n=>n+1)}>Atualizar responsáveis</button>}
    <button type="submit" className="btn-primary" disabled={busy || loading || !candidates.length} aria-label={loading?'Carregando responsáveis':busy?'Criando tarefa':'Criar tarefa'}>{loading?'Carregando…':busy?'Criando…':'Criar tarefa'}</button>
  </form>;
}


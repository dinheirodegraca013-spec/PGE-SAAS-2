import React,{useId,useRef,useState} from 'react';
import type {AcceptanceInput} from '../services/installation.service';
const formatAttachmentName=(value:string)=>value||'Anexo sem nome';
export default function InstallationAcceptanceForm({attachments,attachmentsLoading,disabled,onRegister}:{attachments:{id:string;nome:string}[];attachmentsLoading:boolean;disabled:boolean;onRegister:(input:AcceptanceInput)=>Promise<void>}){
  const id=useId();const [name,setName]=useState('');const [proof,setProof]=useState('');const [notes,setNotes]=useState('');const [confirmed,setConfirmed]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
  const clearError=()=>setError('');
  const lock=useRef(false);const receipt=useRef<{payload:string;id:string}|null>(null);
  return <form className="space-y-3 rounded-xl border border-slate-200 p-4" aria-busy={busy || attachmentsLoading || disabled} onSubmit={async event=>{
    event.preventDefault();if(disabled || lock.current)return;
    if(name.trim().length<2 || !confirmed || !attachments.some(item=>item.id===proof)){setError('Informe o cliente, escolha um comprovante validado e confirme o aceite recebido.');return;}
    const data={clientName:name.trim(),proof,confirmed,notes};const payload=JSON.stringify(data);
    if(receipt.current?.payload!==payload)receipt.current={payload,id:crypto.randomUUID()};
    lock.current=true;setBusy(true);setError('');setMessage('');
    try{await onRegister({...data,request:receipt.current.id});receipt.current=null;setName('');setProof('');setNotes('');setConfirmed(false);setMessage('Aceite registrado com sucesso.');}
    catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível registrar o aceite.');}
    finally{lock.current=false;setBusy(false);}
  }}>
    <h4 className="break-words font-semibold">Registrar aceite da instalação</h4>
    <fieldset className="space-y-3" disabled={disabled || busy}><legend className="sr-only">Dados do aceite da instalação</legend>
      <label htmlFor={`${id}-name`} className="block text-sm">Nome do cliente que confirmou a entrega<input id={`${id}-name`} className="input-field mt-1" required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={event=>{setName(event.target.value);clearError();}}/></label>
      <label htmlFor={`${id}-proof`} className="block text-sm">Comprovante do aceite<select id={`${id}-proof`} className="input-field mt-1" aria-describedby={`${id}-proof-help`} required value={proof} onChange={event=>{setProof(event.target.value);clearError();}}><option value="">Selecione um anexo validado</option>{attachments.map(item=><option key={item.id} value={item.id}>{formatAttachmentName(item.nome)}</option>)}</select></label>
      <p id={`${id}-proof-help`} className="text-xs text-slate-500">Envie o comprovante em Anexos privados. As opções seguem a página de anexos exibida.</p>{!attachmentsLoading&&!attachments.length&&<p role="status" aria-live="polite" className="text-xs text-amber-700">Nenhum comprovante validado disponível. Anexe e valide um comprovante antes de registrar o aceite.</p>}
      <label htmlFor={`${id}-notes`} className="block text-sm">Observações<textarea id={`${id}-notes`} className="input-field mt-1" rows={3} maxLength={2000} value={notes} onChange={event=>{setNotes(event.target.value);clearError();}}/></label>
      <label htmlFor={`${id}-confirmed`} className="flex items-start gap-2 text-sm"><input id={`${id}-confirmed`} className="mt-1 shrink-0" type="checkbox" required checked={confirmed} onChange={event=>{setConfirmed(event.target.checked);clearError();}}/><span className="min-w-0 break-words">Confirmo que o cliente informou o aceite da entrega e que o comprovante selecionado corresponde a esta instalação.</span></label>
      <button type="submit" className="btn-primary inline-flex w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label={busy?'Registrando aceite da instalação':attachmentsLoading?'Carregando comprovantes':disabled?'Aguardando autorização para registrar o aceite':'Registrar aceite da instalação'} disabled={attachmentsLoading || !attachments.length || disabled || busy}>{busy?'Registrando…':attachmentsLoading?'Carregando comprovantes…':disabled?'Aguardando autorização…':'Registrar aceite recebido'}</button>
    </fieldset>
    {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}{message && <p role="status" aria-live="polite" className="break-words text-sm text-emerald-700">{message}</p>}
  </form>;
}


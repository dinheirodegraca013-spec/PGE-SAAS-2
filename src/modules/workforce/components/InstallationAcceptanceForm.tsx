import React,{useId,useRef,useState} from 'react';
import type {AcceptanceInput} from '../services/installation.service';
export default function InstallationAcceptanceForm({attachments,disabled,onRegister}:{attachments:{id:string;nome:string}[];disabled:boolean;onRegister:(input:AcceptanceInput)=>Promise<void>}){
  const id=useId();const [name,setName]=useState('');const [proof,setProof]=useState('');const [notes,setNotes]=useState('');const [confirmed,setConfirmed]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const lock=useRef(false);const receipt=useRef<{payload:string;id:string}|null>(null);
  return <form className="space-y-3 rounded-xl border border-slate-200 p-4" onSubmit={async event=>{
    event.preventDefault();if(disabled || lock.current)return;
    if(name.trim().length<2 || !confirmed || !attachments.some(item=>item.id===proof)){setError('Informe o cliente, escolha um comprovante validado e confirme o aceite recebido.');return;}
    const data={clientName:name.trim(),proof,confirmed,notes};const payload=JSON.stringify(data);
    if(receipt.current?.payload!==payload)receipt.current={payload,id:crypto.randomUUID()};
    lock.current=true;setBusy(true);setError('');
    try{await onRegister({...data,request:receipt.current.id});}
    catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível registrar o aceite.');}
    finally{lock.current=false;setBusy(false);}
  }}>
    <h4 className="font-semibold">Registrar aceite da instalação</h4>
    <fieldset className="space-y-3" disabled={disabled || busy}>
      <label htmlFor={`${id}-name`} className="block text-sm">Nome do cliente que confirmou a entrega<input id={`${id}-name`} className="input-field mt-1" required minLength={2} maxLength={120} value={name} onChange={event=>setName(event.target.value)}/></label>
      <label htmlFor={`${id}-proof`} className="block text-sm">Comprovante do aceite<select id={`${id}-proof`} className="input-field mt-1" required value={proof} onChange={event=>setProof(event.target.value)}><option value="">Selecione um anexo validado</option>{attachments.map(item=><option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
      <p className="text-xs text-slate-500">Envie o comprovante em Anexos privados. As opções seguem a página de anexos exibida.</p>
      <label htmlFor={`${id}-notes`} className="block text-sm">Observações<textarea id={`${id}-notes`} className="input-field mt-1" rows={3} maxLength={2000} value={notes} onChange={event=>setNotes(event.target.value)}/></label>
      <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/><span>Confirmo que o cliente informou o aceite da entrega e que o comprovante selecionado corresponde a esta instalação.</span></label>
      <button type="submit" className="btn-primary" disabled={!attachments.length}>{busy?'Registrando…':'Registrar aceite recebido'}</button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </form>;
}

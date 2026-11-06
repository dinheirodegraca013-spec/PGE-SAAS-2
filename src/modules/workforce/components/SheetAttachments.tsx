import React,{useEffect,useId,useRef,useState} from 'react';
import {attachments,type Attachment,type UploadReceipt} from '../services/attachments.service';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
const formatAttachmentSize=(value:number)=>Number.isFinite(value)&&value>=0?`${Math.ceil(value/1024)} KB`:'Tamanho indisponível';
const formatAttachmentName=(value:string)=>value||'Anexo sem nome';
export default function SheetAttachments({serviceId,sector,canUpload,onListed}:{serviceId:string;sector:string;canUpload:boolean;onListed?:(items:Attachment[])=>void}){
  const {context}=useWorkforceAccess();const id=useId();
  const [items,setItems]=useState<Attachment[]>([]);const [more,setMore]=useState(false);const [page,setPage]=useState(0);const [refresh,setRefresh]=useState(0);
  const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [message,setMessage]=useState('');const [links,setLinks]=useState<Record<string,string>>({});const [linkBusy,setLinkBusy]=useState<string|null>(null);
  const receipt=useRef<UploadReceipt|null>(null);const lock=useRef(false);const generation=useRef(0);const input=useRef<HTMLInputElement>(null);const lastReturnRefresh=useRef(0);
  useEffect(()=>{setPage(0);setFile(null);setMessage('');receipt.current=null;if(input.current)input.current.value='';},[serviceId,sector,context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{const refreshOnReturn=()=>{const now=Date.now();if(document.visibilityState==='visible'&&now-lastReturnRefresh.current>1000){lastReturnRefresh.current=now;setRefresh(value=>value+1);}};window.addEventListener('focus',refreshOnReturn);document.addEventListener('visibilitychange',refreshOnReturn);return()=>{window.removeEventListener('focus',refreshOnReturn);document.removeEventListener('visibilitychange',refreshOnReturn);};},[serviceId,sector]);
  useEffect(()=>{const request=++generation.current;setLoading(true);setError('');setItems([]);setLinks({});onListed?.([]);
    attachments.list(serviceId,sector,page).then(result=>{if(request===generation.current){setItems(result.itens);setMore(result.tem_mais);onListed?.(result.itens);}})
      .catch(cause=>{if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível carregar os anexos.');}).finally(()=>{if(request===generation.current)setLoading(false);});
    return()=>{generation.current++;};
  },[serviceId,sector,page,refresh,context?.funcionario.id,context?.funcionario.versao,onListed]);
  return <section className="space-y-3 rounded-xl border border-slate-200 p-4" aria-busy={loading || busy || !!linkBusy}><h4 className="font-semibold">Anexos privados da ficha</h4>
    {canUpload && <form className="space-y-3" onSubmit={async event=>{
      event.preventDefault();if(lock.current || !!linkBusy || !file)return;
      if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type) || !file.size || file.size>10485760){setError('Envie imagem JPEG, PNG, WebP ou PDF de até 10 MB.');return;}
      lock.current=true;setBusy(true);setError('');setMessage('');
      try{if(!receipt.current)receipt.current=await attachments.prepare(serviceId,sector,file);await attachments.upload(file,receipt.current);receipt.current=null;setFile(null);if(input.current)input.current.value='';setMessage('Arquivo enviado e validado.');setPage(0);setRefresh(n=>n+1);}
      catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível enviar o arquivo.');}
      finally{lock.current=false;setBusy(false);}
    }}><label htmlFor={id} className="block text-sm">Imagem ou PDF, até 10 MB<input ref={input} id={id} className="mt-2 block w-full min-w-0 text-sm" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy || !!linkBusy} onChange={event=>{setFile(event.target.files?.[0]||null);receipt.current=null;setMessage('');setError('');}}/></label><button type="submit" className="btn-secondary" disabled={busy || !!linkBusy || !file}>{busy?'Enviando e validando…':linkBusy?'Aguarde o link…':'Enviar anexo'}</button></form>}
    {loading && <p role="status" aria-live="polite" className="text-sm">Carregando anexos…</p>}{error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" disabled={loading || busy || !!linkBusy} onClick={()=>setRefresh(n=>n+1)}>Tentar novamente</button></div>}{message && <p role="status" aria-live="polite" className="text-sm">{message}</p>}
    {!loading && !error && !items.length && <p className="text-sm text-slate-500">Nenhum anexo validado nesta página.</p>}
    <ul className="divide-y divide-slate-100">{items.map(item=>{const itemBusy=linkBusy===item.id;return <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span className="min-w-0 break-all">{formatAttachmentName(item.nome)} · {formatAttachmentSize(item.tamanho)}</span><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" disabled={busy || !!linkBusy} onClick={async()=>{
      const request=generation.current;setLinkBusy(item.id);setError('');try{const url=await attachments.link(item.caminho);if(request===generation.current)setLinks(current=>({...current,[item.id]:url}));}catch(cause){if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível gerar o link.');}finally{if(request===generation.current)setLinkBusy(null);}
    }}>{itemBusy?'Gerando…':'Gerar link temporário'}</button>{links[item.id] && <a className="btn-secondary" href={links[item.id]} target="_blank" rel="noopener noreferrer">Abrir arquivo · link válido por 60 s</a>}</div></li>;})}</ul>
    <nav aria-label="Paginação de anexos" className="flex flex-wrap items-center gap-3"><button type="button" className="btn-secondary" disabled={loading || busy || !!linkBusy || page===0} onClick={()=>setPage(n=>n-1)}>Anterior</button><span className="text-sm" aria-current="page">Página {page+1}</span><button type="button" className="btn-secondary" disabled={loading || busy || !!linkBusy || !more} onClick={()=>setPage(n=>n+1)}>Próxima</button><button type="button" className="btn-secondary" disabled={loading || busy || !!linkBusy} onClick={()=>setRefresh(n=>n+1)}>Atualizar anexos</button></nav>
  </section>;
}


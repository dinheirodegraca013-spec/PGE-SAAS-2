import React,{useEffect,useId,useRef,useState} from 'react';
import {attachments,type Attachment,type UploadReceipt} from '../services/attachments.service';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
export default function SheetAttachments({serviceId,sector,canUpload,onListed}:{serviceId:string;sector:string;canUpload:boolean;onListed?:(items:Attachment[])=>void}){
  const {context}=useWorkforceAccess();const id=useId();
  const [items,setItems]=useState<Attachment[]>([]);const [more,setMore]=useState(false);const [page,setPage]=useState(0);const [refresh,setRefresh]=useState(0);
  const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [message,setMessage]=useState('');const [links,setLinks]=useState<Record<string,string>>({});
  const receipt=useRef<UploadReceipt|null>(null);const lock=useRef(false);const generation=useRef(0);const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{const request=++generation.current;setLoading(true);setError('');setItems([]);setLinks({});onListed?.([]);
    attachments.list(serviceId,sector,page).then(result=>{if(request===generation.current){setItems(result.itens);setMore(result.tem_mais);onListed?.(result.itens);}})
      .catch(cause=>{if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível carregar os anexos.');}).finally(()=>{if(request===generation.current)setLoading(false);});
    return()=>{generation.current++;};
  },[serviceId,sector,page,refresh,context?.funcionario.id,context?.funcionario.versao,onListed]);
  return <section className="space-y-3 rounded-xl border border-slate-200 p-4"><h4 className="font-semibold">Anexos privados da ficha</h4>
    {canUpload && <form className="space-y-3" onSubmit={async event=>{
      event.preventDefault();if(lock.current || !file)return;
      if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type) || !file.size || file.size>10485760){setError('Envie imagem JPEG, PNG, WebP ou PDF de até 10 MB.');return;}
      lock.current=true;setBusy(true);setError('');setMessage('');
      try{if(!receipt.current)receipt.current=await attachments.prepare(serviceId,sector,file);await attachments.upload(file,receipt.current);receipt.current=null;setFile(null);if(input.current)input.current.value='';setMessage('Arquivo enviado e validado.');setPage(0);setRefresh(n=>n+1);}
      catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível enviar o arquivo.');}
      finally{lock.current=false;setBusy(false);}
    }}><label htmlFor={id} className="block text-sm">Imagem ou PDF, até 10 MB<input ref={input} id={id} className="mt-2 block w-full min-w-0 text-sm" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy} onChange={event=>{setFile(event.target.files?.[0]||null);receipt.current=null;setMessage('');setError('');}}/></label><button type="submit" className="btn-secondary" disabled={busy || !file}>{busy?'Enviando e validando…':'Enviar anexo'}</button></form>}
    {loading && <p role="status" className="text-sm">Carregando anexos…</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    {!loading && !error && !items.length && <p className="text-sm text-slate-500">Nenhum anexo validado nesta página.</p>}
    <ul className="divide-y divide-slate-100">{items.map(item=><li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span className="min-w-0 break-all">{item.nome} · {Math.ceil(item.tamanho/1024)} KB</span><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" disabled={busy} onClick={async()=>{
      const request=generation.current;setError('');try{const url=await attachments.link(item.caminho);if(request===generation.current)setLinks(current=>({...current,[item.id]:url}));}catch(cause){if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível gerar o link.');}
    }}>Gerar link temporário</button>{links[item.id] && <a className="btn-secondary" href={links[item.id]} target="_blank" rel="noopener noreferrer">Abrir arquivo · link válido por 60 s</a>}</div></li>)}</ul>
    <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn-secondary" disabled={loading || busy || page===0} onClick={()=>setPage(n=>n-1)}>Anterior</button><span className="text-sm">Página {page+1}</span><button type="button" className="btn-secondary" disabled={loading || busy || !more} onClick={()=>setPage(n=>n+1)}>Próxima</button><button type="button" className="btn-secondary" disabled={loading || busy} onClick={()=>setRefresh(n=>n+1)}>Atualizar anexos</button></div>
  </section>;
}

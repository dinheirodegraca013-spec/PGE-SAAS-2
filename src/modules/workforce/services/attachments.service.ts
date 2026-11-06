import {supabase} from '@/lib/supabase';
import {mensagemErroFuncao} from '@/services/api/function-errors';
export type Attachment={id:string;nome:string;tipo:string;tamanho:number;caminho:string;criado_em:string};
export type UploadReceipt={id:string;caminho:string;bucket:string;uploaded?:boolean};
const isDate=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(new Date(value).getTime());
const isSetor=(value:unknown):boolean=>typeof value==='string'&&['corte','montagem','acabamento','instalacao','estoque','financeiro'].includes(value);
const isAttachment=(value:unknown):value is Attachment=>{
  if(!value||typeof value!=='object')return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&row.id.length>0&&typeof row.nome==='string'&&row.nome.length>0&&typeof row.tipo==='string'&&row.tipo.length>0&&Number.isSafeInteger(row.tamanho)&&Number(row.tamanho)>0&&typeof row.caminho==='string'&&row.caminho.length>0&&isDate(row.criado_em);
};
const isUploadReceipt=(value:unknown):value is UploadReceipt=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&typeof (value as Record<string,unknown>).id==='string'&&(value as Record<string,unknown>).id&&typeof (value as Record<string,unknown>).caminho==='string'&&(value as Record<string,unknown>).caminho&&(value as Record<string,unknown>).bucket==='workforce-private');
export const attachments={
  async list(service:string,sector:string,page:number):Promise<{itens:Attachment[];tem_mais:boolean}>{
    if(typeof service!=='string'||!service.trim()||typeof sector!=='string'||!isSetor(sector))throw new Error('O serviço ou setor dos anexos é inválido.');
    if(!Number.isSafeInteger(page)||page<0)throw new Error('A página de anexos é inválida.');
    const {data,error}=await supabase.rpc('anexos_ficha_listar',{p_servico:service,p_setor:sector,p_pagina:page});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar os anexos.');if(typeof data!=='object'||Array.isArray(data))throw new Error('Os anexos retornaram dados inválidos. Recarregue a lista.');const row=data as Record<string,unknown>;if(!Array.isArray(row.itens)||typeof row.tem_mais!=='boolean'||!row.itens.every(isAttachment))throw new Error('Os anexos retornaram dados inválidos. Recarregue a lista.');return data as {itens:Attachment[];tem_mais:boolean};
  },
  async prepare(service:string,sector:string,file:File):Promise<UploadReceipt>{
    const {data,error}=await supabase.rpc('anexo_preparar',{p_servico:service,p_setor:sector,p_nome:file.name,p_tipo:file.type,p_tamanho:file.size});
    if(error || !data)throw new Error(error?.message||'Não foi possível preparar o envio.');if(!isUploadReceipt(data))throw new Error('A preparação do anexo retornou dados inválidos. Tente novamente.');return data;
  },
  async upload(file:File,receipt:UploadReceipt):Promise<void>{
    if(receipt.bucket!=='workforce-private')throw new Error('Armazenamento de anexo inválido.');
    if(!receipt.uploaded){
      const {error}=await supabase.storage.from(receipt.bucket).upload(receipt.caminho,file,{contentType:file.type,upsert:false});
      if(!error)receipt.uploaded=true;
      // A lost response can leave the object uploaded. Validation safely resolves
      // that case without replacing an existing object or creating another path.
    }
    const {data,error}=await supabase.functions.invoke('validar-anexo',{body:{anexo_id:receipt.id}});
    if(error || data?.status!=='validado')throw new Error(await mensagemErroFuncao(error,'Não foi possível validar o arquivo. Tente novamente.'));
  },
  async link(path:string):Promise<string>{
    const {data,error}=await supabase.storage.from('workforce-private').createSignedUrl(path,60);
    if(error || !data?.signedUrl)throw new Error('Não foi possível gerar o link. Sua autorização pode ter mudado.');return data.signedUrl;
  },
};


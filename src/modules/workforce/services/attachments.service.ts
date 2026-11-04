import {supabase} from '@/lib/supabase';
import {mensagemErroFuncao} from '@/services/api/function-errors';
export type Attachment={id:string;nome:string;tipo:string;tamanho:number;caminho:string;criado_em:string};
export type UploadReceipt={id:string;caminho:string;bucket:string;uploaded?:boolean};
export const attachments={
  async list(service:string,sector:string,page:number):Promise<{itens:Attachment[];tem_mais:boolean}>{
    const {data,error}=await supabase.rpc('anexos_ficha_listar',{p_servico:service,p_setor:sector,p_pagina:page});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar os anexos.');return data;
  },
  async prepare(service:string,sector:string,file:File):Promise<UploadReceipt>{
    const {data,error}=await supabase.rpc('anexo_preparar',{p_servico:service,p_setor:sector,p_nome:file.name,p_tipo:file.type,p_tamanho:file.size});
    if(error || !data)throw new Error(error?.message||'Não foi possível preparar o envio.');return data;
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

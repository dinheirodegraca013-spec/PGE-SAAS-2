import { supabase } from '@/lib/supabase';
export type ServiceFlow = {setores:string[];versao:number;configurado:boolean;editavel:boolean};
export const servicePipeline = {
  async load(service:string):Promise<ServiceFlow>{
    const {data,error}=await supabase.rpc('fluxo_servico_consultar',{p_servico:service});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar o fluxo.');
    return data;
  },
  async save(service:string,sectors:string[],version:number):Promise<{setores:string[];versao:number}>{
    const {data,error}=await supabase.rpc('fluxo_servico_configurar',{p_servico:service,p_setores:sectors,p_versao:version});
    if(error || !data)throw new Error(error?.code==='40001'?'O fluxo foi alterado. Recarregue antes de salvar.':error?.message||'Não foi possível salvar o fluxo.');
    return data;
  },
};

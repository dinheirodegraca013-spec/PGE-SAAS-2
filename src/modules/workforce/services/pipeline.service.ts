import { supabase } from '@/lib/supabase';
export type ServiceFlow = {setores:string[];versao:number;configurado:boolean;editavel:boolean};
const flowSectors=['financeiro','corte','montagem','acabamento','instalacao'];
const isFlow=(value:unknown):value is ServiceFlow=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return Array.isArray(row.setores)&&row.setores.length>=1&&row.setores.length<=5&&row.setores.every(item=>flowSectors.includes(String(item)))&&new Set(row.setores).size===row.setores.length&&Number.isSafeInteger(row.versao)&&Number(row.versao)>=0&&typeof row.configurado==='boolean'&&typeof row.editavel==='boolean';
};
const isSavedFlow=(value:unknown):value is {setores:string[];versao:number}=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return Array.isArray(row.setores)&&row.setores.length>=1&&row.setores.length<=5&&row.setores.every((item:unknown)=>flowSectors.includes(String(item)))&&new Set(row.setores).size===row.setores.length&&Number.isSafeInteger(row.versao)&&Number(row.versao)>=1;
};
export const servicePipeline = {
  async load(service:string):Promise<ServiceFlow>{
    const {data,error}=await supabase.rpc('fluxo_servico_consultar',{p_servico:service});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar o fluxo.');
    if(!isFlow(data))throw new Error('O fluxo retornou dados inválidos. Recarregue o serviço.');return data;
  },
  async save(service:string,sectors:string[],version:number):Promise<{setores:string[];versao:number}>{
    const {data,error}=await supabase.rpc('fluxo_servico_configurar',{p_servico:service,p_setores:sectors,p_versao:version});
    if(error || !data)throw new Error(error?.code==='40001'?'O fluxo foi alterado. Recarregue antes de salvar.':error?.message||'Não foi possível salvar o fluxo.');
    if(!isSavedFlow(data))throw new Error('O salvamento do fluxo retornou dados inválidos. Recarregue o serviço.');return data;
  },
};


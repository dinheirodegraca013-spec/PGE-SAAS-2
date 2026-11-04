import {supabase} from '@/lib/supabase';
export type IncidentType='equipamento'|'material'|'defeito'|'outro';
export type IncidentSeverity='informativa'|'atencao'|'critica';
export type Incident={id:string;titulo:string;descricao:string;tipo:IncidentType;gravidade:IncidentSeverity;status:'aberta'|'resolvida';criada_em:string;resolvida_em:string|null;resolucao:string|null;versao:number;pode_resolver:boolean};
export const incidents={
  async list(service:string,sector:string,page:number):Promise<{itens:Incident[];tem_mais:boolean}>{
    const {data,error}=await supabase.rpc('ocorrencias_ficha_listar',{p_servico:service,p_setor:sector,p_pagina:page});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar as ocorrências.');return data;
  },
  async create(input:{request:string;service:string;sector:string;title:string;description:string;type:IncidentType;severity:IncidentSeverity}):Promise<void>{
    const {data,error}=await supabase.rpc('ocorrencia_criar',{p_requisicao:input.request,p_servico:input.service,p_setor:input.sector,p_titulo:input.title,p_descricao:input.description,p_tipo:input.type,p_gravidade:input.severity});
    if(error || !data)throw new Error(error?.message||'Não foi possível registrar a ocorrência.');
  },
  async resolve(incident:Incident,resolution:string):Promise<void>{
    const {data,error}=await supabase.rpc('ocorrencia_resolver',{p_ocorrencia:incident.id,p_versao:incident.versao,p_resolucao:resolution});
    if(error || !data)throw new Error(error?.code==='40001'?'A ocorrência foi alterada. Atualize a lista.':error?.message||'Não foi possível registrar a resolução.');
  },
};

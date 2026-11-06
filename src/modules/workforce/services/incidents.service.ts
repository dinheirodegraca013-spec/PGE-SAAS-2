import {supabase} from '@/lib/supabase';
const isSetor=(value:unknown):boolean=>typeof value==='string'&&['corte','montagem','acabamento','instalacao','estoque','financeiro'].includes(value);
const isDateOrNull=(value:unknown):value is string|null=>value===null||(typeof value==='string'&&Number.isFinite(new Date(value).getTime()));
export type IncidentType='equipamento'|'material'|'defeito'|'outro';
export type IncidentSeverity='informativa'|'atencao'|'critica';
export type Incident={id:string;titulo:string;descricao:string;tipo:IncidentType;gravidade:IncidentSeverity;status:'aberta'|'resolvida';criada_em:string;resolvida_em:string|null;resolucao:string|null;versao:number;pode_resolver:boolean};
const isIncident=(value:unknown):value is Incident=>{
  if(!value||typeof value!=='object')return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&row.id.trim().length>0&&typeof row.titulo==='string'&&row.titulo.trim().length>0&&typeof row.descricao==='string'&&row.descricao.trim().length>0&&['equipamento','material','defeito','outro'].includes(String(row.tipo))&&['informativa','atencao','critica'].includes(String(row.gravidade))&&['aberta','resolvida'].includes(String(row.status))&&typeof row.criada_em==='string'&&Number.isFinite(new Date(row.criada_em).getTime())&&isDateOrNull(row.resolvida_em)&&(row.resolucao===null||typeof row.resolucao==='string')&&Number.isSafeInteger(row.versao)&&Number(row.versao)>=1&&typeof row.pode_resolver==='boolean';
};
const isMutation=(value:unknown,status?:string,expectedId?:string)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&typeof (value as Record<string,unknown>).id==='string'&&String((value as Record<string,unknown>).id).trim().length>0&&(!expectedId||(value as Record<string,unknown>).id===expectedId)&&(status===undefined||((value as Record<string,unknown>).status===status))&&Number.isSafeInteger((value as Record<string,unknown>).versao)&&Number((value as Record<string,unknown>).versao)>=1);
export const incidents={
  async list(service:string,sector:string,page:number):Promise<{itens:Incident[];tem_mais:boolean}>{
    if(typeof service!=='string'||!service.trim()||typeof sector!=='string'||!isSetor(sector))throw new Error('O serviço ou setor das ocorrências é inválido.');
    if(!Number.isSafeInteger(page)||page<0)throw new Error('A página de ocorrências é inválida.');
    const {data,error}=await supabase.rpc('ocorrencias_ficha_listar',{p_servico:service,p_setor:sector,p_pagina:page});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar as ocorrências.');if(typeof data!=='object'||Array.isArray(data))throw new Error('As ocorrências retornaram dados inválidos. Recarregue a lista.');const row=data as Record<string,unknown>;if(!Array.isArray(row.itens)||typeof row.tem_mais!=='boolean'||!row.itens.every(isIncident))throw new Error('As ocorrências retornaram dados inválidos. Recarregue a lista.');return data as {itens:Incident[];tem_mais:boolean};
  },
  async create(input:{request:string;service:string;sector:string;title:string;description:string;type:IncidentType;severity:IncidentSeverity}):Promise<void>{
    if(!input||typeof input.request!=='string'||!input.request.trim()||typeof input.service!=='string'||!input.service.trim()||typeof input.sector!=='string'||!isSetor(input.sector)||typeof input.title!=='string'||input.title.trim().length<3||typeof input.description!=='string'||input.description.trim().length<3||!['equipamento','material','defeito','outro'].includes(input.type)||!['informativa','atencao','critica'].includes(input.severity))throw new Error('Os dados da ocorrência são inválidos.');
    const {data,error}=await supabase.rpc('ocorrencia_criar',{p_requisicao:input.request,p_servico:input.service,p_setor:input.sector,p_titulo:input.title,p_descricao:input.description,p_tipo:input.type,p_gravidade:input.severity});
    if(error || !data)throw new Error(error?.message||'Não foi possível registrar a ocorrência.');if(!isMutation(data))throw new Error('O registro da ocorrência retornou dados inválidos. Tente novamente.');
  },
  async resolve(incident:Incident,resolution:string):Promise<void>{
    if(!isIncident(incident)||incident.status!=='aberta'||typeof resolution!=='string'||resolution.trim().length<3)throw new Error('Os dados da resolução são inválidos.');
    const {data,error}=await supabase.rpc('ocorrencia_resolver',{p_ocorrencia:incident.id,p_versao:incident.versao,p_resolucao:resolution});
    if(error || !data)throw new Error(error?.code==='40001'?'A ocorrência foi alterada. Atualize a lista.':error?.message||'Não foi possível registrar a resolução.');if(!isMutation(data,'resolvida',incident.id))throw new Error('A resolução retornou dados inválidos. Recarregue a lista.');
  },
};

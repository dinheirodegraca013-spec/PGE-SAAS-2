import {supabase} from '@/lib/supabase';
import {isSetor} from '@/lib/setores';
export const taskStatusLabels={pendente:'Pendente',em_andamento:'Em andamento',pausada:'Pausada',aguardando_material:'Aguardando material',aguardando_aprovacao:'Aguardando aprovação',concluida:'Concluída',cancelada:'Cancelada'} as const;
export type TaskStatus=keyof typeof taskStatusLabels;
export type WorkTask={id:string;servico_id:string|null;setor:string;titulo:string;descricao:string;responsavel_id:string;criado_por:string;criada_em:string;iniciada_em:string|null;prazo:string|null;prioridade:'baixa'|'normal'|'alta'|'urgente';status:TaskStatus;progresso:number;obrigatoria:boolean;observacoes:string;versao:number};
export type TaskPage={itens:WorkTask[];tem_mais:boolean};
const isTaskStatus=(value:unknown):value is TaskStatus=>typeof value==='string'&&value in taskStatusLabels;
const isDateOrNull=(value:unknown):value is string|null=>value===null||(typeof value==='string'&&Number.isFinite(new Date(value).getTime()));
const isWorkTask=(value:unknown):value is WorkTask=>{
  if(!value||typeof value!=='object')return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&row.id.length>0&&(row.servico_id===null||typeof row.servico_id==='string')&&typeof row.setor==='string'&&isSetor(row.setor)&&typeof row.titulo==='string'&&row.titulo.length>0&&typeof row.descricao==='string'&&typeof row.responsavel_id==='string'&&row.responsavel_id.length>0&&typeof row.criado_por==='string'&&row.criado_por.length>0&&typeof row.criada_em==='string'&&Number.isFinite(new Date(row.criada_em).getTime())&&isDateOrNull(row.iniciada_em)&&isDateOrNull(row.prazo)&&['baixa','normal','alta','urgente'].includes(String(row.prioridade))&&isTaskStatus(row.status)&&typeof row.progresso==='number'&&Number.isInteger(row.progresso)&&row.progresso>=0&&row.progresso<=100&&typeof row.obrigatoria==='boolean'&&typeof row.observacoes==='string'&&Number.isSafeInteger(row.versao)&&Number(row.versao)>=1;
};
const isTaskPage=(value:unknown):value is TaskPage=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return Array.isArray(row.itens)&&typeof row.tem_mais==='boolean'&&row.itens.every(isWorkTask);
};
const isCreateResult=(value:unknown):value is {id:string;versao:number;repetida:boolean}=>Boolean(value&&typeof value==='object'&&typeof (value as Record<string,unknown>).id==='string'&&Number.isSafeInteger((value as Record<string,unknown>).versao)&&Number((value as Record<string,unknown>).versao)>=1&&typeof (value as Record<string,unknown>).repetida==='boolean');
const isUpdateResult=(value:unknown,expectedId?:string):value is Partial<WorkTask>=>Boolean(value&&typeof value==='object'&&typeof (value as Record<string,unknown>).id==='string'&&(!expectedId||(value as Record<string,unknown>).id===expectedId)&&isTaskStatus((value as Record<string,unknown>).status)&&Number.isSafeInteger((value as Record<string,unknown>).versao)&&Number((value as Record<string,unknown>).versao)>=1&&typeof (value as Record<string,unknown>).progresso==='number'&&Number.isInteger((value as Record<string,unknown>).progresso)&&Number((value as Record<string,unknown>).progresso)>=0&&Number((value as Record<string,unknown>).progresso)<=100&&typeof (value as Record<string,unknown>).observacoes==='string');
export const workTasks={
  async load(id:string):Promise<WorkTask>{
    if(typeof id!=='string'||!id.trim())throw new Error('A tarefa é inválida.');
    const {data,error}=await supabase.rpc('tarefa_consultar',{p_tarefa:id});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar a tarefa.');if(!isWorkTask(data))throw new Error('A tarefa retornou dados inválidos. Recarregue a lista.');return data;
  },
  async create(input:{request:string;sector:string;title:string;description:string;employee:string;service:string|null;deadline:string|null;priority:WorkTask['prioridade'];mandatory:boolean}):Promise<{id:string;versao:number;repetida:boolean}>{
    const {data,error}=await supabase.rpc('tarefa_criar',{p_requisicao:input.request,p_setor:input.sector,p_titulo:input.title,p_descricao:input.description,p_responsavel:input.employee,p_servico:input.service,p_prazo:input.deadline,p_prioridade:input.priority,p_obrigatoria:input.mandatory});
    if(error || !data)throw new Error(error?.message||'Não foi possível criar a tarefa.');if(!isCreateResult(data))throw new Error('A criação da tarefa retornou dados inválidos. Tente novamente.');return data;
  },
  async list(page:number,status:TaskStatus|null):Promise<TaskPage>{
    if(!Number.isSafeInteger(page)||page<0)throw new Error('A página de tarefas é inválida.');
    if(status!==null&&!isTaskStatus(status))throw new Error('O filtro de tarefas é inválido.');
    const {data,error}=await supabase.rpc('minhas_tarefas',{p_pagina:page,p_status:status});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar as tarefas.');if(!isTaskPage(data))throw new Error('As tarefas retornaram dados inválidos. Recarregue a lista.');return data;
  },
  async update(task:WorkTask,status:TaskStatus,progress:number,notes:string):Promise<Partial<WorkTask>>{
    const {data,error}=await supabase.rpc('tarefa_atualizar',{p_tarefa:task.id,p_status:status,p_versao:task.versao,p_progresso:status==='concluida'?null:progress,p_observacoes:notes});
    if(error || !data)throw new Error(error?.code==='40001'?'A tarefa foi alterada. Atualize a lista antes de continuar.':error?.message||'Não foi possível atualizar a tarefa.');if(!isUpdateResult(data,task.id))throw new Error('A atualização da tarefa retornou dados inválidos. Recarregue a lista.');return data;
  },
};


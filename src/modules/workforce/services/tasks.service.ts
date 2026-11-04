import {supabase} from '@/lib/supabase';
export const taskStatusLabels={pendente:'Pendente',em_andamento:'Em andamento',pausada:'Pausada',aguardando_material:'Aguardando material',aguardando_aprovacao:'Aguardando aprovação',concluida:'Concluída',cancelada:'Cancelada'} as const;
export type TaskStatus=keyof typeof taskStatusLabels;
export type WorkTask={id:string;servico_id:string|null;setor:string;titulo:string;descricao:string;responsavel_id:string;criado_por:string;criada_em:string;iniciada_em:string|null;prazo:string|null;prioridade:'baixa'|'normal'|'alta'|'urgente';status:TaskStatus;progresso:number;obrigatoria:boolean;observacoes:string;versao:number};
export type TaskPage={itens:WorkTask[];tem_mais:boolean};
export const workTasks={
  async create(input:{request:string;sector:string;title:string;description:string;employee:string;service:string|null;deadline:string|null;priority:WorkTask['prioridade'];mandatory:boolean}):Promise<{id:string;versao:number;repetida:boolean}>{
    const {data,error}=await supabase.rpc('tarefa_criar',{p_requisicao:input.request,p_setor:input.sector,p_titulo:input.title,p_descricao:input.description,p_responsavel:input.employee,p_servico:input.service,p_prazo:input.deadline,p_prioridade:input.priority,p_obrigatoria:input.mandatory});
    if(error || !data)throw new Error(error?.message||'Não foi possível criar a tarefa.');return data;
  },
  async list(page:number,status:TaskStatus|null):Promise<TaskPage>{
    const {data,error}=await supabase.rpc('minhas_tarefas',{p_pagina:page,p_status:status});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar as tarefas.');return data;
  },
  async update(task:WorkTask,status:TaskStatus,progress:number,notes:string):Promise<Partial<WorkTask>>{
    const {data,error}=await supabase.rpc('tarefa_atualizar',{p_tarefa:task.id,p_status:status,p_versao:task.versao,p_progresso:status==='concluida'?null:progress,p_observacoes:notes});
    if(error || !data)throw new Error(error?.code==='40001'?'A tarefa foi alterada. Atualize a lista antes de continuar.':error?.message||'Não foi possível atualizar a tarefa.');return data;
  },
};

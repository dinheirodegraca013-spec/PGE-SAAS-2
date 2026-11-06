import {supabase} from '@/lib/supabase';
export type WorkNotification={id:string;servico_id:string|null;tarefa_id:string|null;setor:string;evento:'ficha_atribuida'|'etapa_liberada'|'tarefa_atribuida';criada_em:string;lida_em:string|null};
export type NotificationPage={itens:WorkNotification[];tem_mais:boolean;nao_lidas:number};
const isNotification=(value:unknown):value is WorkNotification=>{
  if(!value||typeof value!=='object')return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&(row.servico_id===null||typeof row.servico_id==='string')&&(row.tarefa_id===null||typeof row.tarefa_id==='string')&&typeof row.setor==='string'&&['ficha_atribuida','etapa_liberada','tarefa_atribuida'].includes(String(row.evento))&&typeof row.criada_em==='string'&&(row.lida_em===null||typeof row.lida_em==='string');
};
const isNotificationPage=(value:unknown):value is NotificationPage=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return Array.isArray(row.itens)&&row.itens.every(isNotification)&&typeof row.tem_mais==='boolean'&&Number.isSafeInteger(row.nao_lidas)&&Number(row.nao_lidas)>=0;
};
export const workNotifications={
  async list(page:number):Promise<NotificationPage>{
    const {data,error}=await supabase.rpc('minhas_notificacoes',{p_pagina:page});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar as notificações.');
    if(!isNotificationPage(data))throw new Error('As notificações retornaram dados inválidos. Recarregue a lista.');return data;
  },
  async read(id:string):Promise<{id:string;lida_em:string}>{
    const {data,error}=await supabase.rpc('notificacao_marcar_lida',{p_notificacao:id});
    if(error || !data)throw new Error(error?.message||'Não foi possível marcar a notificação como lida.');
    if(typeof data!=='object'||!data||typeof (data as Record<string,unknown>).id!=='string'||typeof (data as Record<string,unknown>).lida_em!=='string')throw new Error('A confirmação da notificação retornou dados inválidos.');return data as {id:string;lida_em:string};
  },
};


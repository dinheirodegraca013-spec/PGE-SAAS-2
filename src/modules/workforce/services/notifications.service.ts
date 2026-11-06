import {supabase} from '@/lib/supabase';
import {isSetor} from '@/lib/setores';
export type WorkNotification={id:string;servico_id:string|null;tarefa_id:string|null;setor:string;evento:'ficha_atribuida'|'etapa_liberada'|'tarefa_atribuida';criada_em:string;lida_em:string|null};
export type NotificationPage={itens:WorkNotification[];tem_mais:boolean;nao_lidas:number};
const isDate=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(new Date(value).getTime());
const isNotification=(value:unknown):value is WorkNotification=>{
  if(!value||typeof value!=='object')return false;
  const row=value as Record<string,unknown>;
  const event=row.evento;
  const serviceLink=typeof row.servico_id==='string'&&row.servico_id.length>0;
  const taskLink=typeof row.tarefa_id==='string'&&row.tarefa_id.length>0;
  const relationValid=(event==='tarefa_atribuida'&&taskLink)||(event==='ficha_atribuida'||event==='etapa_liberada')&&serviceLink&&!taskLink;
  return typeof row.id==='string'&&row.id.length>0&&(row.servico_id===null||serviceLink)&&(row.tarefa_id===null||taskLink)&&typeof row.setor==='string'&&isSetor(row.setor)&&relationValid&&isDate(row.criada_em)&&(row.lida_em===null||isDate(row.lida_em));
};
const isNotificationPage=(value:unknown):value is NotificationPage=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return Array.isArray(row.itens)&&row.itens.every(isNotification)&&typeof row.tem_mais==='boolean'&&Number.isSafeInteger(row.nao_lidas)&&Number(row.nao_lidas)>=0;
};
export const workNotifications={
  async list(page:number):Promise<NotificationPage>{
    if(!Number.isSafeInteger(page)||page<0)throw new Error('A página de notificações é inválida.');
    const {data,error}=await supabase.rpc('minhas_notificacoes',{p_pagina:page});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar as notificações.');
    if(!isNotificationPage(data))throw new Error('As notificações retornaram dados inválidos. Recarregue a lista.');return data;
  },
  async read(id:string):Promise<{id:string;lida_em:string}>{
    if(typeof id!=='string'||!id.trim())throw new Error('A notificação é inválida.');
    const {data,error}=await supabase.rpc('notificacao_marcar_lida',{p_notificacao:id});
    if(error || !data)throw new Error(error?.message||'Não foi possível marcar a notificação como lida.');
    if(typeof data!=='object'||!data||Array.isArray(data)||typeof (data as Record<string,unknown>).id!=='string'||(data as Record<string,unknown>).id!==id||!isDate((data as Record<string,unknown>).lida_em))throw new Error('A confirmação da notificação retornou dados inválidos.');return data as {id:string;lida_em:string};
  },
};


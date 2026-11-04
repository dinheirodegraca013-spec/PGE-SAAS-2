import {supabase} from '@/lib/supabase';
export type WorkNotification={id:string;servico_id:string;setor:string;evento:'ficha_atribuida'|'etapa_liberada';criada_em:string;lida_em:string|null};
export type NotificationPage={itens:WorkNotification[];tem_mais:boolean;nao_lidas:number};
export const workNotifications={
  async list(page:number):Promise<NotificationPage>{
    const {data,error}=await supabase.rpc('minhas_notificacoes',{p_pagina:page});
    if(error || !data)throw new Error(error?.message||'Não foi possível carregar as notificações.');
    return data;
  },
  async read(id:string):Promise<{id:string;lida_em:string}>{
    const {data,error}=await supabase.rpc('notificacao_marcar_lida',{p_notificacao:id});
    if(error || !data)throw new Error(error?.message||'Não foi possível marcar a notificação como lida.');
    return data;
  },
};

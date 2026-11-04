import {supabase} from '@/lib/supabase';
export type AgendaItem={id:string;servico_id:string|null;setor:string;tipo:'tarefa';titulo:string;descricao:string;status:string;prioridade:string;inicio:string;obrigatoria:boolean;progresso:number};
export const agendaService={async list(start:string,end:string):Promise<{inicio:string;fim:string;itens:AgendaItem[]}>{const {data,error}=await supabase.rpc('minha_agenda',{p_inicio:start,p_fim:end});if(error||!data)throw new Error(error?.message||'Não foi possível carregar a agenda.');return data;}};

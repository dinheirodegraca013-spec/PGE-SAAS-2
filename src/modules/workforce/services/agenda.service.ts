import {supabase} from '@/lib/supabase';
export type AgendaItem={id:string;servico_id:string|null;setor:string;tipo:'tarefa';titulo:string;descricao:string;status:string;prioridade:string;inicio:string;obrigatoria:boolean;progresso:number};
const isAgendaItem=(value:unknown):value is AgendaItem=>{
  if(!value||typeof value!=='object')return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&(row.servico_id===null||typeof row.servico_id==='string')&&typeof row.setor==='string'&&row.tipo==='tarefa'&&typeof row.titulo==='string'&&typeof row.descricao==='string'&&typeof row.status==='string'&&typeof row.prioridade==='string'&&typeof row.inicio==='string'&&typeof row.obrigatoria==='boolean'&&typeof row.progresso==='number'&&Number.isFinite(row.progresso)&&row.progresso>=0&&row.progresso<=100;
};
export const agendaService={async list(start:string,end:string):Promise<{inicio:string;fim:string;itens:AgendaItem[]}>{const {data,error}=await supabase.rpc('minha_agenda',{p_inicio:start,p_fim:end});if(error||!data)throw new Error(error?.message||'Não foi possível carregar a agenda.');if(typeof data!=='object'||Array.isArray(data))throw new Error('A agenda retornou dados inválidos. Recarregue a página.');const row=data as Record<string,unknown>;if(typeof row.inicio!=='string'||typeof row.fim!=='string'||!Array.isArray(row.itens)||!row.itens.every(isAgendaItem))throw new Error('A agenda retornou dados incompletos. Recarregue a página.');return data as {inicio:string;fim:string;itens:AgendaItem[]};}};


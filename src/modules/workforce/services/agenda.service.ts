import {supabase} from '@/lib/supabase';
import {isSetor} from '@/lib/setores';
export type AgendaItem={id:string;servico_id:string|null;setor:string;tipo:'tarefa';titulo:string;descricao:string;status:string;prioridade:string;inicio:string;obrigatoria:boolean;progresso:number};
const isDate=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(new Date(value).getTime());
const isAgendaItem=(value:unknown):value is AgendaItem=>{
  if(!value||typeof value!=='object')return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&row.id.length>0&&(row.servico_id===null||typeof row.servico_id==='string'&&row.servico_id.length>0)&&typeof row.setor==='string'&&isSetor(row.setor)&&row.tipo==='tarefa'&&typeof row.titulo==='string'&&row.titulo.length>0&&typeof row.descricao==='string'&&typeof row.status==='string'&&row.status.length>0&&typeof row.prioridade==='string'&&row.prioridade.length>0&&isDate(row.inicio)&&typeof row.obrigatoria==='boolean'&&typeof row.progresso==='number'&&Number.isFinite(row.progresso)&&Number.isInteger(row.progresso)&&row.progresso>=0&&row.progresso<=100;
};
export const agendaService={async list(start:string,end:string):Promise<{inicio:string;fim:string;itens:AgendaItem[]}>{if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<start)throw new Error('Informe um intervalo de datas válido.');const {data,error}=await supabase.rpc('minha_agenda',{p_inicio:start,p_fim:end});if(error||!data)throw new Error(error?.message||'Não foi possível carregar a agenda.');if(typeof data!=='object'||Array.isArray(data))throw new Error('A agenda retornou dados inválidos. Recarregue a página.');const row=data as Record<string,unknown>;if(!isDate(row.inicio)||!isDate(row.fim)||!Array.isArray(row.itens)||!row.itens.every(isAgendaItem))throw new Error('A agenda retornou dados incompletos. Recarregue a página.');return data as {inicio:string;fim:string;itens:AgendaItem[]};}};


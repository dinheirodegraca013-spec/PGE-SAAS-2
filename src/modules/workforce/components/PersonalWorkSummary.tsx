import React,{useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
import {hasPermission} from '../lib/access';
type Summary={tarefas:{total:number;pendentes:number;em_andamento:number;concluidas:number;atrasadas:number;aguardando_material:number;aguardando_aprovacao:number};ordens_em_execucao:number;proximos_prazos:{id:string;titulo:string;setor:string;prazo:string}[]};
export default function PersonalWorkSummary(){
  const {context}=useWorkforceAccess();const [summary,setSummary]=useState<Summary|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;setLoading(true);setSummary(null);setError('');
    Promise.resolve(supabase.rpc('meu_resumo_operacional')).then(({data,error})=>{if(!active)return;if(error || !data){setError(error?.message||'Não foi possível carregar os indicadores.');return;}setSummary(data);})
      .catch(()=>{if(active)setError('Não foi possível carregar os indicadores.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[context?.funcionario.id,context?.funcionario.versao,retry]);
  const cards=summary?[
    ...(hasPermission(context,'tarefas')?[
      ['Tarefas atribuídas',summary.tarefas.total],['Pendentes',summary.tarefas.pendentes],['Em andamento',summary.tarefas.em_andamento],
      ['Concluídas',summary.tarefas.concluidas],['Atrasadas',summary.tarefas.atrasadas],['Aguardando material',summary.tarefas.aguardando_material],['Aguardando aprovação',summary.tarefas.aguardando_aprovacao],
    ]:[]),...(hasPermission(context,'ordens')?[['Serviços em execução',summary.ordens_em_execucao]]:[]),
  ]:[];
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Meu trabalho hoje</h2><button type="button" className="btn-secondary" disabled={loading} onClick={()=>setRetry(n=>n+1)}>Atualizar indicadores</button></div>
    {loading && <p role="status">Carregando indicadores…</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {summary && <><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label,value])=><div key={label} className="card p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
      {hasPermission(context,'tarefas') && <div className="card p-4"><h3 className="font-semibold">Próximos prazos</h3>{!summary.proximos_prazos.length?<p className="mt-2 text-sm text-slate-500">Nenhuma tarefa com prazo pendente.</p>:<ul className="divide-y divide-slate-100">{summary.proximos_prazos.map(task=><li key={task.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{task.titulo}</span><time dateTime={task.prazo}>{new Date(task.prazo).toLocaleString('pt-BR')}</time></li>)}</ul>}</div>}
    </>}
  </section>;
}

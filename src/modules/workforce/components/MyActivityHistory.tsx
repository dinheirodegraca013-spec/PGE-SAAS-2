import React,{useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {isSetor,setores} from '@/lib/setores';
import {useWorkforceAccess} from '../context/WorkforceAccessContext';
type Page={itens:{id:number;acao:string;tabela:string|null;registro_id:string|null;created_at:string;setor:string|null}[];tem_mais:boolean};
const labels:Record<string,string>={tarefa_criada:'Tarefa criada',tarefa_atualizada:'Tarefa atualizada',ficha_tecnica_salva:'Ficha técnica salva',checklist_atualizado:'Checklist atualizado',ficha_execucao_iniciar:'Execução iniciada ou retomada',ficha_execucao_pausar:'Execução pausada',ficha_execucao_concluir:'Execução concluída',ficha_responsavel_alterado:'Responsável alterado',fluxo_configurado:'Fluxo configurado',etapa_liberada:'Próxima etapa liberada',fluxo_concluido:'Fluxo concluído',FUNCIONARIO_PERMISSOES_ALTERADAS:'Permissões do funcionário atualizadas'};
function formatActivityDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Data não informada':date.toLocaleString('pt-BR');}
function safeActivityDateTime(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?undefined:date.toISOString();}
export default function MyActivityHistory(){
  const {context}=useWorkforceAccess();const [data,setData]=useState<Page|null>(null);const [page,setPage]=useState(0);const [refresh,setRefresh]=useState(0);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const lastReturnRefresh=useRef(0);
  useEffect(()=>{setPage(0);},[context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{setData(null);setError('');},[context?.funcionario.id,context?.funcionario.versao]);
  useEffect(()=>{const refreshOnReturn=()=>{const now=Date.now();if(document.visibilityState==='visible'&&now-lastReturnRefresh.current>1000){lastReturnRefresh.current=now;setRefresh(value=>value+1);}};window.addEventListener('focus',refreshOnReturn);document.addEventListener('visibilitychange',refreshOnReturn);return()=>{window.removeEventListener('focus',refreshOnReturn);document.removeEventListener('visibilitychange',refreshOnReturn);};},[context?.funcionario.id]);
  useEffect(()=>{let active=true;setLoading(true);
    Promise.resolve().then(()=>supabase.rpc('minhas_atividades',{p_pagina:page})).then(({data,error})=>{if(!active)return;if(error || !data){setError(error?.message||'Não foi possível carregar o histórico.');return;}setData(data);})
      .catch(()=>{if(active)setError('Não foi possível carregar o histórico.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[page,refresh,context?.funcionario.id,context?.funcionario.versao]);
  return <section className="card space-y-4 p-5" aria-busy={loading}><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold">Meu histórico de atividades</h2><button type="button" className="btn-secondary" disabled={loading} onClick={()=>setRefresh(n=>n+1)} aria-label={loading?'Atualizando histórico':'Atualizar histórico'}>{loading?'Atualizando…':'Atualizar histórico'}</button></div>
    {loading && <p role="status" aria-live="polite">Carregando histórico…</p>}{error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" onClick={()=>setRefresh(n=>n+1)}>Tentar novamente</button></div>}
    {data && !data.itens.length && <p className="text-sm text-slate-500">Nenhuma atividade disponível nesta página.</p>}
    {data && <ol className="divide-y divide-slate-100">{data.itens.map(item=><li key={item.id} className="space-y-1 py-3"><p className="text-sm font-medium">{labels[item.acao]||'Atividade registrada'}</p><p className="text-xs text-slate-500">{isSetor(item.setor)?`${setores[item.setor]} · `:''}<time dateTime={safeActivityDateTime(item.created_at)}>{formatActivityDate(item.created_at)}</time></p></li>)}</ol>}
    {data && <nav aria-label="Paginação do histórico de atividades" className="flex items-center gap-3"><button type="button" className="btn-secondary" disabled={loading || page===0} onClick={()=>setPage(n=>n-1)}>Anterior</button><span className="text-sm" aria-current="page">Página {page+1}</span><button type="button" className="btn-secondary" disabled={loading || !data.tem_mais} onClick={()=>setPage(n=>n+1)}>Próxima</button></nav>}
  </section>;
}


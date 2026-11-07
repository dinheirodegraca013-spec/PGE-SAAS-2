import React, { useEffect, useRef, useState } from 'react';
import { isSetor, setores } from '@/lib/setores';
import { useWorkforceAccess } from '../context/WorkforceAccessContext';
import { technicalSheets } from '../services/technical-sheet.service';
import ServiceTechnicalSheet from './ServiceTechnicalSheet';
const workforceRefreshEvent = 'gestio:refresh-workforce';

type List = Awaited<ReturnType<typeof technicalSheets.list>>;
function formatSheetUpdate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Atualização não informada':`Atualizada em ${date.toLocaleString('pt-BR')}`;}
function safeSheetDateTime(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?undefined:date.toISOString();}
export default function MyServiceSheets() {
  const { context, loading: accessLoading, error: accessError, reload: reloadAccess } = useWorkforceAccess();
  const [list, setList] = useState<List | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selected, setSelected] = useState<List['itens'][number] | null>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const lastReturnRefresh = useRef(0);
  useEffect(() => { setPage(0); setSearch(''); setQuery(''); }, [context?.funcionario.id, context?.funcionario.versao]);
  useEffect(() => { if (selected) selectedRef.current?.focus(); }, [selected]);
  useEffect(() => { if (!selected && returnFocus.current) { returnFocus.current = false; openerRef.current?.focus(); } }, [selected]);
  useEffect(() => { setList(null); setSelected(null); setUpdatedAt(null); }, [page, query, context?.funcionario.id, context?.funcionario.versao, accessError]);
  useEffect(() => { const refreshOnReturn = () => { const now = Date.now(); if (document.visibilityState === 'visible' && now - lastReturnRefresh.current > 1000) { lastReturnRefresh.current = now; setRefresh(value => value + 1); } }; window.addEventListener('focus', refreshOnReturn); document.addEventListener('visibilitychange', refreshOnReturn); return () => { window.removeEventListener('focus', refreshOnReturn); document.removeEventListener('visibilitychange', refreshOnReturn); }; }, [context?.funcionario.id]);
  useEffect(() => { const refreshPanel = () => setRefresh(value => value + 1); window.addEventListener(workforceRefreshEvent, refreshPanel); return () => window.removeEventListener(workforceRefreshEvent, refreshPanel); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    if (accessLoading) { setList(null); setSelected(null); setUpdatedAt(null); return () => { active = false; }; }
    if (accessError || !context) { setList(null); setSelected(null); setUpdatedAt(null); setError(accessError || 'Não foi possível validar o acesso às fichas.'); setLoading(false); return () => { active = false; }; }
    technicalSheets.list(page, query).then(result => { if (active) { setList(result); setUpdatedAt(new Date()); setSelected(current => current && result.itens.some(item => item.servico_id === current.servico_id && item.setor === current.setor) ? current : null); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as fichas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, refresh, accessLoading, accessError, context?.funcionario.id, context?.funcionario.versao]);
  return <section className="card space-y-4 p-5" aria-labelledby="service-sheets-title" aria-busy={loading || accessLoading}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h2 id="service-sheets-title" className="break-words text-lg font-bold">Minhas fichas de serviço</h2><span className="text-xs text-slate-500" aria-live="polite">{accessLoading?'Validando acesso…':loading?'Atualizando fichas…':updatedAt?`Atualizadas às ${updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando atualização'}</span></div><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={loading || accessLoading} onClick={() => setRefresh(value => value + 1)} aria-label={accessLoading?'Validando acesso':loading?'Atualizando fichas':'Atualizar fichas'}>{accessLoading?'Validando…':loading?'Atualizando…':'Atualizar fichas'}</button></div>
    <form className="flex flex-wrap gap-2" role="search" aria-label="Pesquisar fichas de serviço" aria-busy={loading || accessLoading} onSubmit={event => { event.preventDefault(); if (loading || accessLoading) return; setPage(0); setQuery(search.trim()); setRefresh(n => n + 1); }}>
      <label className="min-w-0 flex-1"><span className="sr-only">Pesquisar serviço</span><input type="search" className="input-field" maxLength={120} disabled={loading || accessLoading} value={search} onChange={event => { setSearch(event.target.value); setError(''); }} placeholder="Pesquisar serviço" /></label>
      <button className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" type="submit" disabled={loading || accessLoading} aria-label={accessLoading?'Validando acesso':loading?'Pesquisando fichas':'Pesquisar fichas'}>{accessLoading?'Validando…':loading?'Pesquisando…':'Pesquisar'}</button>{query && <button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={loading || accessLoading} onClick={() => { setSearch(''); setQuery(''); setPage(0); }} aria-label="Limpar pesquisa de fichas">Limpar pesquisa</button>}
    </form>
    {loading && <p role="status" aria-live="polite">{list ? 'Atualizando fichas…' : 'Carregando fichas…'}</p>}
    {error && <div role="alert" className="flex flex-col gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0 break-words">{error}</span><button type="button" className="w-full shrink-0 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 sm:w-auto" disabled={loading || accessLoading} aria-label={accessLoading?'Validando acesso':loading?'Atualizando fichas':'Tentar carregar as fichas novamente'} onClick={() => accessError ? void reloadAccess() : setRefresh(n => n + 1)}>{accessLoading?'Validando…':loading?'Atualizando…':'Tentar novamente'}</button></div>}
    {list && <p role="status" aria-live="polite" className="text-xs text-slate-500">{list.itens.length} {list.itens.length === 1 ? 'ficha visível' : 'fichas visíveis'} nesta página{loading ? ' · atualizando' : list.tem_mais ? ' · Há mais fichas disponíveis.' : ''}</p>}
    {list && !loading && !list.itens.length && <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-200 p-4"><p className="min-w-0 break-words text-sm text-slate-500">{query ? `Nenhuma ficha encontrada para “${query}”.` : 'Nenhuma ficha liberada para você no momento.'}</p></div>}
    {list && <ul className="divide-y divide-slate-100">{list.itens.map(item => <li key={`${item.servico_id}:${item.setor}`} aria-label={`Ficha ${item.titulo} · ${isSetor(item.setor) ? setores[item.setor] : item.setor} · ${formatSheetUpdate(item.atualizado_em)}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0"><p className="break-words font-medium">{item.titulo}</p><p className="break-words text-sm text-slate-500">{isSetor(item.setor) ? setores[item.setor] : item.setor}</p><time className="text-xs text-slate-500" dateTime={safeSheetDateTime(item.atualizado_em)}>{formatSheetUpdate(item.atualizado_em)}</time></div>
      <button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" disabled={loading || accessLoading} onClick={event => {
        if (selected && !window.confirm('Abrir outra ficha? Alterações não salvas serão descartadas.')) return;
        setError('');
        openerRef.current = event.currentTarget;
        setSelected(item);
      }} aria-label={`Abrir ficha ${item.titulo}`}>Abrir ficha</button>
    </li>)}</ul>}
    {list && (list.itens.length || page>0 || list.tem_mais) && <nav aria-label="Paginação de fichas de serviço" className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Ir para a página anterior de fichas" disabled={loading || accessLoading || page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button><span className="shrink-0 text-center text-sm sm:text-left" aria-current="page" aria-live="polite">Página {page + 1}</span><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Ir para a próxima página de fichas" disabled={loading || accessLoading || !list.tem_mais} onClick={() => setPage(p => p + 1)}>Próxima</button></nav>}
    {selected && <div ref={selectedRef} tabIndex={-1} className="space-y-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2" aria-label={`Ficha aberta: ${selected.titulo}`}><div className="flex justify-end"><button type="button" className="btn-secondary w-full shrink-0 whitespace-nowrap sm:w-auto" aria-label="Fechar ficha aberta" onClick={() => { returnFocus.current = true; setSelected(null); }}>Fechar ficha</button></div><ServiceTechnicalSheet key={`${selected.servico_id}:${selected.setor}`} serviceId={selected.servico_id} sector={selected.setor} /></div>}
  </section>;
}


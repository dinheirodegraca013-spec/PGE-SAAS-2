import React, { useEffect, useRef, useState } from 'react';
import { isSetor, setores } from '@/lib/setores';
import { useWorkforceAccess } from '../context/WorkforceAccessContext';
import { technicalSheets } from '../services/technical-sheet.service';
import ServiceTechnicalSheet from './ServiceTechnicalSheet';

type List = Awaited<ReturnType<typeof technicalSheets.list>>;
function formatSheetUpdate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Atualização não informada':`Atualizada em ${date.toLocaleString('pt-BR')}`;}
export default function MyServiceSheets() {
  const { context } = useWorkforceAccess();
  const [list, setList] = useState<List | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selected, setSelected] = useState<List['itens'][number] | null>(null);
  const lastReturnRefresh = useRef(0);
  useEffect(() => { setPage(0); setSearch(''); setQuery(''); }, [context?.funcionario.id, context?.funcionario.versao]);
  useEffect(() => { setList(null); setSelected(null); setUpdatedAt(null); }, [page, query, context?.funcionario.id, context?.funcionario.versao]);
  useEffect(() => { const refreshOnReturn = () => { const now = Date.now(); if (document.visibilityState === 'visible' && now - lastReturnRefresh.current > 1000) { lastReturnRefresh.current = now; setRefresh(value => value + 1); } }; window.addEventListener('focus', refreshOnReturn); document.addEventListener('visibilitychange', refreshOnReturn); return () => { window.removeEventListener('focus', refreshOnReturn); document.removeEventListener('visibilitychange', refreshOnReturn); }; }, [context?.funcionario.id]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    technicalSheets.list(page, query).then(result => { if (active) { setList(result); setUpdatedAt(new Date()); setSelected(current => current && result.itens.some(item => item.servico_id === current.servico_id && item.setor === current.setor) ? current : null); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as fichas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, refresh, context?.funcionario.id, context?.funcionario.versao]);
  return <section className="card space-y-4 p-5" aria-labelledby="service-sheets-title" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="service-sheets-title" className="text-lg font-bold">Minhas fichas de serviço</h2><span className="text-xs text-slate-500" aria-live="polite">{loading?'Atualizando fichas…':updatedAt?`Atualizadas às ${updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando atualização'}</span></div><button type="button" className="btn-secondary" disabled={loading} onClick={() => setRefresh(value => value + 1)} aria-label={loading?'Atualizando fichas':'Atualizar fichas'}>{loading?'Atualizando…':'Atualizar fichas'}</button></div>
    <form className="flex flex-wrap gap-2" aria-busy={loading} onSubmit={event => { event.preventDefault(); if (loading) return; setPage(0); setQuery(search.trim()); setRefresh(n => n + 1); }}>
      <label className="min-w-0 flex-1"><span className="sr-only">Pesquisar serviço</span><input className="input-field" maxLength={120} disabled={loading} value={search} onChange={event => { setSearch(event.target.value); setError(''); }} placeholder="Pesquisar serviço" /></label>
      <button className="btn-secondary" type="submit" disabled={loading} aria-label={loading?'Pesquisando fichas':'Pesquisar fichas'}>{loading?'Pesquisando…':'Pesquisar'}</button>
    </form>
    {loading && <p role="status" aria-live="polite">Carregando fichas…</p>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" aria-label="Tentar carregar as fichas novamente" onClick={() => setRefresh(n => n + 1)}>Tentar novamente</button></div>}
    {list && !list.itens.length && <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-200 p-4"><p className="text-sm text-slate-500">{query ? `Nenhuma ficha encontrada para “${query}”.` : 'Nenhuma ficha liberada para você no momento.'}</p>{query && <button type="button" className="btn-secondary" disabled={loading} onClick={() => { setSearch(''); setQuery(''); setPage(0); }}>Limpar pesquisa</button>}</div>}
    {list && <ul className="divide-y divide-slate-100">{list.itens.map(item => <li key={`${item.servico_id}:${item.setor}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div><p className="font-medium">{item.titulo}</p><p className="text-sm text-slate-500">{isSetor(item.setor) ? setores[item.setor] : item.setor}</p><time className="text-xs text-slate-500" dateTime={item.atualizado_em}>{formatSheetUpdate(item.atualizado_em)}</time></div>
      <button type="button" className="btn-secondary" disabled={loading} onClick={() => {
        if (selected && !window.confirm('Abrir outra ficha? Alterações não salvas serão descartadas.')) return;
        setSelected(item);
      }} aria-label={`Abrir ficha ${item.titulo}`}>Abrir ficha</button>
    </li>)}</ul>}
    {list && <nav aria-label="Paginação de fichas de serviço" className="flex items-center gap-3"><button type="button" className="btn-secondary" aria-label="Ir para a página anterior de fichas" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button><span className="text-sm" aria-current="page" aria-live="polite">Página {page + 1}</span><button type="button" className="btn-secondary" aria-label="Ir para a próxima página de fichas" disabled={loading || !list.tem_mais} onClick={() => setPage(p => p + 1)}>Próxima</button></nav>}
    {selected && <div className="space-y-3"><div className="flex justify-end"><button type="button" className="btn-secondary" onClick={() => setSelected(null)}>Fechar ficha</button></div><ServiceTechnicalSheet key={`${selected.servico_id}:${selected.setor}`} serviceId={selected.servico_id} sector={selected.setor} /></div>}
  </section>;
}


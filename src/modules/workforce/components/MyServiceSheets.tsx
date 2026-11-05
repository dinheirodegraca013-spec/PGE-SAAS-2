import React, { useEffect, useState } from 'react';
import { isSetor, setores } from '@/lib/setores';
import { useWorkforceAccess } from '../context/WorkforceAccessContext';
import { technicalSheets } from '../services/technical-sheet.service';
import ServiceTechnicalSheet from './ServiceTechnicalSheet';

type List = Awaited<ReturnType<typeof technicalSheets.list>>;
export default function MyServiceSheets() {
  const { context } = useWorkforceAccess();
  const [list, setList] = useState<List | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<List['itens'][number] | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setList(null); setSelected(null);
    technicalSheets.list(page, query).then(result => { if (active) setList(result); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as fichas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, refresh, context?.funcionario.id, context?.funcionario.versao]);
  return <section className="card space-y-4 p-5" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Minhas fichas de serviço</h2><span className="text-xs text-slate-500" aria-live="polite">{loading?'Atualizando fichas…':'Fichas sincronizadas'}</span></div>
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setPage(0); setQuery(search.trim()); setRefresh(n => n + 1); }}>
      <label className="min-w-0 flex-1"><span className="sr-only">Pesquisar serviço</span><input className="input-field" maxLength={120} value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar serviço" /></label>
      <button className="btn-secondary" type="submit" disabled={loading}>{loading?'Pesquisando…':'Pesquisar'}</button>
    </form>
    {loading && <p role="status" aria-live="polite">Carregando fichas…</p>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" onClick={() => setRefresh(n => n + 1)}>Tentar novamente</button></div>}
    {list && !list.itens.length && <p className="text-sm text-slate-500">Nenhuma ficha liberada para você com estes filtros.</p>}
    {list && <ul className="divide-y divide-slate-100">{list.itens.map(item => <li key={`${item.servico_id}:${item.setor}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div><p className="font-medium">{item.titulo}</p><p className="text-sm text-slate-500">{isSetor(item.setor) ? setores[item.setor] : item.setor}</p></div>
      <button type="button" className="btn-secondary" onClick={() => {
        if (selected && !window.confirm('Abrir outra ficha? Alterações não salvas serão descartadas.')) return;
        setSelected(item);
      }}>Abrir ficha</button>
    </li>)}</ul>}
    {list && <nav aria-label="Paginação de fichas de serviço" className="flex items-center gap-3"><button type="button" className="btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button><span className="text-sm" aria-current="page">Página {page + 1}</span><button type="button" className="btn-secondary" disabled={!list.tem_mais} onClick={() => setPage(p => p + 1)}>Próxima</button></nav>}
    {selected && <ServiceTechnicalSheet key={`${selected.servico_id}:${selected.setor}`} serviceId={selected.servico_id} sector={selected.setor} />}
  </section>;
}


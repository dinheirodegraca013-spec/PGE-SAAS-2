import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';
import { isSetor, setores } from '@/lib/setores';
import { useWorkforceAccess } from '@/modules/workforce/context/WorkforceAccessContext';
import { authorizedSectors,hasPermission } from '@/modules/workforce/lib/access';
import MyServiceSheets from '@/modules/workforce/components/MyServiceSheets';
import WorkNotifications from '@/modules/workforce/components/WorkNotifications';
import MyTasks from '@/modules/workforce/components/MyTasks';
import PersonalWorkSummary from '@/modules/workforce/components/PersonalWorkSummary';
import MyActivityHistory from '@/modules/workforce/components/MyActivityHistory';
import AgendaPanel from '@/modules/workforce/components/AgendaPanel';
import { requestWorkforceRefresh } from '@/modules/workforce/lib/events';

type ProjetoSetor = { id: string; titulo: string; prazo: string | null };
function normalizeProjects(value: unknown): ProjetoSetor[] {
  if (!Array.isArray(value)) throw new Error('Resposta de projetos inválida.');
  const projects = value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Resposta de projetos inválida.');
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    const titulo = typeof row.titulo === 'string' ? row.titulo.trim() : '';
    const prazo = row.prazo == null ? null : typeof row.prazo === 'string' ? row.prazo : '';
    if (!id || !titulo || (prazo !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(prazo) || Number.isNaN(new Date(`${prazo}T12:00:00`).getTime())))) throw new Error('Resposta de projetos inválida.');
    return { id, titulo, prazo };
  });
  if (new Set(projects.map(project => project.id)).size !== projects.length) throw new Error('Resposta de projetos inválida.');
  return projects.sort((a, b) => {
    if (!a.prazo && !b.prazo) return a.titulo.localeCompare(b.titulo, 'pt-BR');
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo.localeCompare(b.prazo) || a.titulo.localeCompare(b.titulo, 'pt-BR');
  });
}

function formatPrazo(value: string | null) {
  if (!value) return 'Sem prazo informado';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Prazo não informado' : `Entrega: ${date.toLocaleDateString('pt-BR')}`;
}
function formatAccessDate(value: string | null) {
  if (!value) return 'Ainda não acessou';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleString('pt-BR');
}
const employeeStatusLabels: Record<string, string> = {
  ativo: 'Ativo', inativo: 'Inativo', suspenso: 'Suspenso', suspenso_plano: 'Suspenso pelo plano',
};

export default function MeuSetorView() {
  const { usuario } = useAuthStore();
  const { context, loading: accessLoading, error: accessError, reload: reloadAccess }=useWorkforceAccess();
  const [projetos, setProjetos] = useState<ProjetoSetor[]>([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [atualizacao, setAtualizacao] = useState(0);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const lastReturnRefresh = useRef(0);
  const lastContextKey = useRef('');
  const setor = context?.funcionario.setor;
  const sectorList=authorizedSectors(context);
  useEffect(() => {
    const updateConnection = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline) requestWorkforceRefresh();
    };
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => { window.removeEventListener('online', updateConnection); window.removeEventListener('offline', updateConnection); };
  }, []);
  useEffect(() => { const refreshOnReturn = () => { const now = Date.now(); if (document.visibilityState === 'visible' && now - lastReturnRefresh.current > 1000) { lastReturnRefresh.current = now; setAtualizacao(value => value + 1); } }; window.addEventListener('focus', refreshOnReturn); document.addEventListener('visibilitychange', refreshOnReturn); return () => { window.removeEventListener('focus', refreshOnReturn); document.removeEventListener('visibilitychange', refreshOnReturn); }; }, [context?.funcionario.id]);
  useEffect(() => {
    let mounted = true;
    setCarregando(true);
    setErro('');
    const contextKey = context ? `${context.empresa_id}:${context.funcionario.id}` : '';
    if (contextKey !== lastContextKey.current) {
      lastContextKey.current = contextKey;
      setProjetos([]);
    }
    if (accessLoading || !context) {
      setCarregando(accessLoading);
      return () => { mounted = false; };
    }
    if (!online) {
      setErro('Sem conexão com a internet. O painel será sincronizado quando a conexão voltar.');
      setCarregando(false);
      return () => { mounted = false; };
    }
    async function carregar() {
      try {
        const { data, error } = await supabase.rpc('meu_setor_projetos');
        if (error) throw error;
        if (mounted) {
          setProjetos(normalizeProjects(data));
          setAtualizadoEm(new Date());
        }
      } catch {
        if (mounted) setErro('Não foi possível carregar os projetos do setor. Tente novamente.');
      } finally {
        if (mounted) setCarregando(false);
      }
    }
    void carregar();
    return () => { mounted = false; };
  }, [accessLoading, context, setor, usuario?.usuarioId, usuario?.tenantId, context?.funcionario.versao, atualizacao, online]);
  const nome = (context?.funcionario.nome || usuario?.nomeCompleto || 'colaborador').trim() || 'colaborador';
  const additionalSectors = sectorList.filter(isSetor).filter(s => s !== setor);
  const quickActions = [
    hasPermission(context, 'tarefas') && { href: '#tarefas', label: 'Minhas tarefas', detail: 'Atualize andamento e impedimentos' },
    hasPermission(context, 'ordens') && { href: '#ordens', label: 'Ordens de serviço', detail: 'Consulte as ordens atribuídas' },
    hasPermission(context, 'agenda') && { href: '#agenda', label: 'Agenda', detail: 'Veja os próximos prazos' },
    hasPermission(context, 'notificacoes') && { href: '#notificacoes', label: 'Notificações', detail: 'Confira avisos recentes' },
    hasPermission(context, 'atividades') && { href: '#atividades', label: 'Histórico', detail: 'Consulte suas últimas ações' },
    hasPermission(context, 'perfil') && { href: '#perfil', label: 'Meu perfil', detail: 'Confira seus dados de acesso' },
  ].filter(Boolean) as { href: string; label: string; detail: string }[];
  return <div className="space-y-6" aria-busy={carregando || accessLoading}>
    <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Painel do funcionário</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Olá, {nome.split(' ')[0]}.</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Seu espaço de trabalho para acompanhar prioridades, prazos e atividades autorizadas.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button type="button" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60" disabled={carregando || !online} aria-label={carregando ? 'Atualizando painel' : !online ? 'Sem conexão para atualizar painel' : 'Atualizar painel'} onClick={() => { setAtualizacao(value => value + 1); requestWorkforceRefresh(); }}>
            {carregando ? 'Atualizando…' : 'Atualizar painel'}
          </button>
          <span className="text-xs text-slate-400" aria-live="polite">{atualizadoEm ? `Atualizado às ${atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando primeira atualização'}</span>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-cyan-400/15 px-3 py-1.5 font-semibold text-cyan-200">{isSetor(setor) ? setores[setor] : 'Setor não atribuído'}</span>
        {context?.funcionario.cargo && <span className="text-slate-300">{context.funcionario.cargo}</span>}
        {additionalSectors.length > 0 && <span className="text-slate-400">Acesso adicional: {additionalSectors.map(s => setores[s]).join(', ')}</span>}
      </div>
    </header>
    {!online && <p role="status" aria-live="assertive" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Você está offline. As informações exibidas podem estar desatualizadas; a sincronização será retomada quando a conexão voltar.</p>}
    {accessLoading && <p role="status" aria-live="polite" className="rounded-xl bg-cyan-50 p-4 text-sm text-cyan-900">Validando seu acesso de funcionário…</p>}
    {erro && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 p-4 text-rose-800"><span>{erro}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100" aria-label="Tentar carregar os projetos novamente" onClick={() => setAtualizacao(value => value + 1)}>Tentar novamente</button></div>}
    {accessError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 p-4 text-rose-800"><span>{accessError}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100" onClick={() => void reloadAccess()}>Validar acesso novamente</button></div>}
    {(sectorList.includes('estoque')&&hasPermission(context,'estoque') || sectorList.includes('financeiro')&&hasPermission(context,'financeiro')) && <div className="flex flex-wrap gap-3">
      {sectorList.includes('estoque')&&hasPermission(context,'estoque')&&<Link className="btn-primary inline-flex" to="/estoque">Abrir painel de estoque <span aria-hidden="true">→</span></Link>}
      {sectorList.includes('financeiro')&&hasPermission(context,'financeiro')&&<Link className="btn-primary inline-flex" to="/meu-financeiro">Abrir painel financeiro <span aria-hidden="true">→</span></Link>}
    </div>}
    {context && !accessLoading && !accessError && !quickActions.length && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">Seu acesso está ativo, mas ainda não há módulos operacionais liberados. Fale com o administrador da empresa.</p>}
    {quickActions.length > 0 && <nav aria-label="Ações rápidas" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {quickActions.map(action => <a key={action.href} href={action.href} aria-label={`${action.label}: ${action.detail}`} className="card group p-4 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"><span className="text-sm font-semibold text-slate-900 group-hover:text-cyan-700">{action.label} <span aria-hidden="true">↗</span></span><span className="mt-1 block text-xs text-slate-500">{action.detail}</span></a>)}
    </nav>}
    {(hasPermission(context,'tarefas') || hasPermission(context,'ordens')) && <PersonalWorkSummary />}
    {hasPermission(context,'agenda') && <div id="agenda" className="scroll-mt-6"><AgendaPanel /></div>}
    {hasPermission(context,'tarefas') && <div id="tarefas" className="scroll-mt-6"><MyTasks /></div>}
    {hasPermission(context,'notificacoes') && <div id="notificacoes" className="scroll-mt-6"><WorkNotifications /></div>}
    {hasPermission(context,'ordens') && <div id="ordens" className="scroll-mt-6"><MyServiceSheets /></div>}
    {hasPermission(context,'atividades') && <div id="atividades" className="scroll-mt-6"><MyActivityHistory /></div>}
    {context && hasPermission(context,'perfil') && <section id="perfil" className="card scroll-mt-6 p-5" aria-labelledby="employee-profile-title">
      <h2 id="employee-profile-title" className="text-lg font-bold">Meu perfil</h2>
      <p className="mt-1 text-sm text-slate-500">Dados do seu acesso na empresa. Para alterar informações, fale com o administrador.</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome completo</dt><dd className="mt-1 font-semibold text-slate-900">{context.funcionario.nome || 'Não informado'}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail</dt><dd className="mt-1 break-all text-slate-900">{context.funcionario.email || 'Não informado'}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cargo ou função</dt><dd className="mt-1 text-slate-900">{context.funcionario.cargo || 'Não informado'}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status do acesso</dt><dd className="mt-1 font-semibold text-slate-900">{employeeStatusLabels[context.funcionario.status] || 'Indisponível'}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Último acesso</dt><dd className="mt-1 text-slate-900">{formatAccessDate(context.funcionario.ultimo_acesso)}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Identificador interno</dt><dd className="mt-1 text-slate-900">{context.funcionario.identificador_interno || 'Não informado'}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Setores autorizados</dt><dd className="mt-1 text-slate-900">{sectorList.length ? sectorList.filter(isSetor).map(item => setores[item]).join(', ') : 'Nenhum setor informado'}</dd></div>
      </dl>
    </section>}
    {context && <section className="card p-5" aria-labelledby="sector-projects-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="sector-projects-title" className="text-lg font-bold">Projetos do setor</h2>
      <p className="mt-1 text-sm text-slate-500">Projetos encaminhados pelo administrador da empresa.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{carregando ? '…' : erro ? 'Indisponível' : `${projetos.length} ${projetos.length === 1 ? 'projeto' : 'projetos'}`}</span></div>
      {carregando ? <p role="status" aria-live="polite" className="py-6">Carregando projetos…</p> : erro ?
        <p className="py-6 text-sm text-slate-500">Os projetos não puderam ser exibidos agora. Use “Tentar novamente” para atualizar.</p> : !projetos.length ?
        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">Nenhum projeto encaminhado para este setor. O administrador poderá encaminhar novos projetos quando necessário.</p> :
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">{projetos.map(p => <li key={p.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><b className="block text-slate-900">{p.titulo}</b><span className="mt-2 block text-sm text-slate-500">{formatPrazo(p.prazo)}</span></li>)}</ul>}
    </section>}
  </div>;
}

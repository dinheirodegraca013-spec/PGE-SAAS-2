import React, { useEffect, useState } from 'react';
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

type ProjetoSetor = { id: string; titulo: string; prazo: string | null };

function formatPrazo(value: string | null) {
  if (!value) return 'Sem prazo informado';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Prazo não informado' : `Entrega: ${date.toLocaleDateString('pt-BR')}`;
}

export default function MeuSetorView() {
  const { usuario } = useAuthStore();
  const { context }=useWorkforceAccess();
  const [projetos, setProjetos] = useState<ProjetoSetor[]>([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [atualizacao, setAtualizacao] = useState(0);
  const setor = context?.funcionario.setor || usuario?.setor;
  const sectorList=authorizedSectors(context);
  useEffect(() => {
    let mounted = true;
    setCarregando(true);
    setErro('');
    setProjetos([]);
    async function carregar() {
      try {
        const { data, error } = await supabase.rpc('meu_setor_projetos');
        if (error) throw error;
        if (mounted) setProjetos(data || []);
      } catch {
        if (mounted) setErro('Não foi possível carregar os projetos do setor. Tente novamente.');
      } finally {
        if (mounted) setCarregando(false);
      }
    }
    void carregar();
    return () => { mounted = false; };
  }, [setor, usuario?.usuarioId, usuario?.tenantId, context?.funcionario.versao, atualizacao]);
  const nome = context?.funcionario.nome || usuario?.nomeCompleto || 'colaborador';
  const additionalSectors = sectorList.filter(isSetor).filter(s => s !== setor);
  const quickActions = [
    hasPermission(context, 'tarefas') && { href: '#tarefas', label: 'Minhas tarefas', detail: 'Atualize andamento e impedimentos' },
    hasPermission(context, 'ordens') && { href: '#ordens', label: 'Ordens de serviço', detail: 'Consulte as ordens atribuídas' },
    hasPermission(context, 'agenda') && { href: '#agenda', label: 'Agenda', detail: 'Veja os próximos prazos' },
    hasPermission(context, 'notificacoes') && { href: '#notificacoes', label: 'Notificações', detail: 'Confira avisos recentes' },
  ].filter(Boolean) as { href: string; label: string; detail: string }[];
  return <div className="space-y-6">
    <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Painel do funcionário</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Olá, {nome.split(' ')[0]}.</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Seu espaço de trabalho para acompanhar prioridades, prazos e atividades autorizadas.</p>
        </div>
        <button type="button" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60" disabled={carregando} onClick={() => setAtualizacao(value => value + 1)}>
          {carregando ? 'Atualizando…' : 'Atualizar projetos'}
        </button>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-cyan-400/15 px-3 py-1.5 font-semibold text-cyan-200">{isSetor(setor) ? setores[setor] : 'Setor não atribuído'}</span>
        {context?.funcionario.cargo && <span className="text-slate-300">{context.funcionario.cargo}</span>}
        {additionalSectors.length > 0 && <span className="text-slate-400">Acesso adicional: {additionalSectors.map(s => setores[s]).join(', ')}</span>}
      </div>
    </header>
    {erro && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 p-4 text-rose-800"><span>{erro}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100" onClick={() => setAtualizacao(value => value + 1)}>Tentar novamente</button></div>}
    {(sectorList.includes('estoque')&&hasPermission(context,'estoque') || sectorList.includes('financeiro')&&hasPermission(context,'financeiro')) && <div className="flex flex-wrap gap-3">
      {sectorList.includes('estoque')&&hasPermission(context,'estoque')&&<Link className="btn-primary inline-flex" to="/estoque">Abrir painel de estoque <span aria-hidden="true">→</span></Link>}
      {sectorList.includes('financeiro')&&hasPermission(context,'financeiro')&&<Link className="btn-primary inline-flex" to="/meu-financeiro">Abrir painel financeiro <span aria-hidden="true">→</span></Link>}
    </div>}
    {quickActions.length > 0 && <nav aria-label="Ações rápidas" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {quickActions.map(action => <a key={action.href} href={action.href} className="card group p-4 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-sm"><span className="text-sm font-semibold text-slate-900 group-hover:text-cyan-700">{action.label} <span aria-hidden="true">↗</span></span><span className="mt-1 block text-xs text-slate-500">{action.detail}</span></a>)}
    </nav>}
    {(hasPermission(context,'tarefas') || hasPermission(context,'ordens')) && <PersonalWorkSummary />}
    {hasPermission(context,'agenda') && <div id="agenda"><AgendaPanel /></div>}
    {hasPermission(context,'tarefas') && <div id="tarefas"><MyTasks /></div>}
    {hasPermission(context,'notificacoes') && <div id="notificacoes"><WorkNotifications /></div>}
    {hasPermission(context,'ordens') && <div id="ordens"><MyServiceSheets /></div>}
    {hasPermission(context,'atividades') && <MyActivityHistory />}
    <section className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Projetos do setor</h2>
      <p className="mt-1 text-sm text-slate-500">Projetos encaminhados pelo administrador da empresa.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{projetos.length} {projetos.length === 1 ? 'projeto' : 'projetos'}</span></div>
      {carregando ? <p role="status" aria-live="polite" className="py-6">Carregando projetos…</p> : erro ?
        <p className="py-6 text-sm text-slate-500">Os projetos não puderam ser exibidos agora. Use “Tentar novamente” para atualizar.</p> : !projetos.length ?
        <p className="py-6 text-slate-500">Nenhum projeto encaminhado para este setor.</p> :
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">{projetos.map(p => <li key={p.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><b className="block text-slate-900">{p.titulo}</b><span className="mt-2 block text-sm text-slate-500">{formatPrazo(p.prazo)}</span></li>)}</ul>}
    </section>
  </div>;
}


import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';
import { isSetor, setores } from '@/lib/setores';
import { useWorkforceAccess } from '@/modules/workforce/context/WorkforceAccessContext';
import { authorizedSectors,hasPermission } from '@/modules/workforce/lib/access';

type ProjetoSetor = { id: string; titulo: string; prazo: string | null };

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
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-cyan-700">Meu setor</p>
      <h1 className="text-3xl font-bold">{isSetor(setor) ? setores[setor] : 'Setor não atribuído'}</h1>
      <p className="mt-2 text-slate-500">Olá, {context?.funcionario.nome||usuario?.nomeCompleto}. Acompanhe o trabalho destinado ao seu setor.</p>
      {context?.funcionario.cargo&&<p className="mt-1 text-sm text-slate-500">{context.funcionario.cargo}</p>}
      {sectorList.length>1&&<p className="mt-1 text-sm text-slate-500">Setores autorizados: {sectorList.filter(isSetor).map(s=>setores[s]).join(', ')}</p>}
      </div><button type="button" className="btn-secondary" disabled={carregando} onClick={() => setAtualizacao(value => value + 1)}>{carregando ? 'Atualizando…' : 'Atualizar'}</button>
    </header>
    {erro && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">{erro}</p>}
    {sectorList.includes('estoque')&&hasPermission(context,'estoque')&&<Link className="btn-primary inline-flex" to="/estoque">Abrir painel de estoque</Link>}
    {sectorList.includes('financeiro')&&hasPermission(context,'financeiro')&&<Link className="btn-primary inline-flex" to="/meu-financeiro">Abrir painel financeiro</Link>}
    <section className="card p-5"><h2 className="text-lg font-bold">Projetos do setor</h2>
      <p className="mt-1 text-sm text-slate-500">Projetos encaminhados pelo administrador da empresa.</p>
      {carregando ? <p role="status" className="py-6">Carregando…</p> : !erro && !projetos.length ?
        <p className="py-6 text-slate-500">Nenhum projeto encaminhado para este setor.</p> :
        <ul className="mt-4 divide-y divide-slate-100">{projetos.map(p => <li key={p.id} className="flex flex-wrap justify-between gap-2 py-4"><b>{p.titulo}</b><span className="text-sm text-slate-500">{p.prazo ? `Entrega: ${new Date(p.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Sem prazo informado'}</span></li>)}</ul>}
    </section>
  </div>;
}

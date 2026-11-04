import React, { useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  RefreshCw,
  UserRoundCheck,
  UserRound,
  UserX,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentTenantId } from "@/services/api/client";
import { useAuthStore } from '@/stores/auth';
import { isSetor, setores, podeCadastrarFuncionario } from '@/lib/setores';
import { mensagemErroFuncao } from '@/services/api/function-errors';
import { Link } from 'react-router-dom';
import DeviceManager from '@/components/DeviceManager';
import EmployeeAccessEditor from '@/modules/workforce/components/EmployeeAccessEditor';

type Perfil = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  papel: string | null;
  ativo: boolean | null;
  setor: string | null;
  cargo: string | null;
  suspenso: boolean;
};
type Limits = { plan: string; sublogin_limit: number; device_limit: number; sublogins_active: number; sublogins_available: number; sublogins_suspended: number; owner_id: string; suspended_ids: string[] };
const actionLabels: Record<string,string> = {account_created:'Conta criada',account_changed:'Acesso alterado',device_authorized:'Dispositivo autorizado',device_revoked:'Dispositivo revogado',plan_changed:'Plano alterado',plan_limits_changed:'Limites do plano alterados'};

export default function EquipeView() {
  const { usuario } = useAuthStore();
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [setor, setSetor] = useState('corte');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [projetoId, setProjetoId] = useState('');
  const [projetos, setProjetos] = useState<{id: string; titulo: string}[]>([]);
  const [setorProjeto, setSetorProjeto] = useState('corte');
  const administrador = podeCadastrarFuncionario(usuario?.papel);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editActive, setEditActive] = useState(true);
  const [deviceUser, setDeviceUser] = useState<string | undefined>();
  const [audit, setAudit] = useState<{id: number;action: string;subject_id: string | null;created_at: string}[]>([]);
  const [accessUser,setAccessUser]=useState<string|null>(null);
  const cadastrar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (salvando) return;
    setSalvando(true); setErro(null); setSucesso('');
    try {
      if (editingId) {
        const { error } = await supabase.rpc('gerenciar_funcionario', { p_usuario_id: editingId, p_nome: nome.trim(), p_setor: setor, p_ativo: editActive });
        if (error) throw new Error(error.message);
        setSucesso('Acesso do funcionário atualizado.'); setNovo(false); setEditingId(null);
        await carregar(); return;
      }
      if (!limits || limits.sublogins_available <= 0) throw new Error('Limite de sublogins atingido ou indisponível. Atualize a tela ou veja as opções de upgrade.');
      const { data, error } = await supabase.functions.invoke('cadastrar-funcionario', {
        body: { nome: nome.trim(), email: email.trim(), setor },
      });
      if (error || !data?.success) {
        const fallback = data?.error || 'Não foi possível cadastrar. Tente novamente mais tarde.';
        throw new Error(await mensagemErroFuncao(error, fallback));
      }
      setSucesso('Funcionário cadastrado. O link para definir a senha foi enviado por e-mail.');
      setNovo(false); setNome(''); setEmail('');
      await carregar();
    } catch (error) { setErro(error instanceof Error ? error.message : 'Falha ao cadastrar funcionário.'); }
    finally { setSalvando(false); }
  };
  const encaminhar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (salvando) return;
    setSalvando(true); setErro(null); setSucesso('');
    try {
      const { error } = await supabase.rpc('encaminhar_projeto_setor', { p_projeto_id: projetoId, p_setor: setorProjeto });
      if (error) throw error;
      setSucesso('Projeto encaminhado para o painel do setor.'); setProjetoId('');
    } catch { setErro('Não foi possível encaminhar o projeto. Verifique o projeto e a sua permissão.'); }
    finally { setSalvando(false); }
  };
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      setErro("Sessão sem empresa vinculada. Faça login novamente.");
      setPerfis([]);
      setCarregando(false);
      return;
    }
    try {
    let query = supabase
      .from("profiles")
      .select("id,nome_completo,email,papel,ativo,setor,cargo,suspenso")
      .order("nome_completo");
    query = query.eq("tenant_id", tenantId);
    const result = await query;
    if (result.error) {
      setErro(
        "A equipe não pôde ser carregada. Verifique a permissão do administrador da empresa.",
      );
      setPerfis([]);
    } else setPerfis((result.data || []) as Perfil[]);
    if (administrador) {
      try {
        const [quota, history] = await Promise.all([supabase.rpc('limites_acesso'), supabase.rpc('historico_acessos')]);
        if (quota.error) throw quota.error;
        setLimits(quota.data);
        if (!history.error) setAudit(history.data || []);
      } catch { setLimits(null); setErro('Não foi possível consultar os limites do plano. Atualize a página.'); }
    }
    } catch { setErro('Não foi possível carregar a equipe. Confira sua conexão e tente novamente.'); }
    finally { setCarregando(false); }
  };
  useEffect(() => {
    void carregar();
  }, []);
  useEffect(() => {
    if (!administrador || !usuario?.tenantId) return;
    let mounted = true;
    supabase.from('projetos_marcenaria').select('id,titulo').eq('tenant_id', usuario.tenantId).order('titulo')
      .then(({ data, error }) => { if (mounted) setProjetos(error ? [] : data || []); });
    return () => { mounted = false; };
  }, [administrador, usuario?.tenantId]);

  const ativos = perfis.filter((perfil) => perfil.ativo).length;
  const inativos = perfis.filter((perfil) => perfil.ativo === false).length;
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return perfis;
    return perfis.filter((perfil) =>
      [perfil.nome_completo, perfil.email, perfil.papel]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo)),
    );
  }, [busca, perfis]);

  return (
    <div className="space-y-5 pb-5">
      <header className="gestio-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <UserRoundCheck className="h-5 w-5 text-cyan-600" />
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Equipe
            </h1>
          </div>
          <p className="gestio-section-subtitle">
            Colaboradores da empresa e situação de acesso.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        {administrador && <button type="button" className="btn-primary" disabled={!limits || limits.sublogins_available <= 0} onClick={() => { setEditingId(null); setNome(''); setEmail(''); setSetor('corte'); setNovo(true); setSucesso(''); }}>Novo funcionário</button>}
        <button
          type="button"
          onClick={() => void carregar()}
          disabled={carregando}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
        </div>
      </header>
      {administrador && limits && <section className="card space-y-2 p-5">
        <h2 className="text-lg font-bold">Acessos do plano {limits.plan}</h2>
        <p className="text-sm">{Math.min(limits.sublogins_active, limits.sublogin_limit)} de {limits.sublogin_limit} sublogins utilizados · {limits.sublogins_available} disponíveis · {limits.device_limit} dispositivo(s) por login.</p>
        <p className="text-sm text-slate-500">A conta principal não ocupa uma vaga. No downgrade, os cadastros mais antigos permanecem liberados.</p>
        {limits.sublogins_suspended > 0 && <p role="status" className="text-sm text-amber-700">{limits.sublogins_suspended} funcionário(s) suspenso(s) pelo limite do plano.</p>}
        {limits.sublogins_available === 0 && <p className="text-sm text-amber-700">Limite atingido. Desative um funcionário ou amplie seu plano.</p>}
        <Link to="/configuracoes?tab=assinatura" className="inline-block text-sm font-semibold text-cyan-700">Ver planos e opções de upgrade →</Link>
      </section>}
      {sucesso && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{sucesso}</p>}
      {accessUser&&<EmployeeAccessEditor userId={accessUser} onCancel={()=>setAccessUser(null)} onSaved={()=>{setAccessUser(null);setSucesso('Setores e permissões atualizados.');void carregar();}}/>}
      {novo && administrador && <form onSubmit={cadastrar} className="card space-y-4 p-5">
        <h2 className="text-lg font-bold">{editingId ? 'Editar funcionário' : 'Cadastrar funcionário'}</h2>
        <p className="text-sm text-slate-500">O funcionário recebe acesso somente ao setor escolhido e define a própria senha por e-mail.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Nome completo<input required minLength={2} maxLength={120} autoComplete="name" className="input-field mt-1" value={nome} onChange={e => setNome(e.target.value)} disabled={salvando} /></label>
          <label className="text-sm">E-mail<input required type="email" maxLength={254} autoComplete="email" className="input-field mt-1" value={email} onChange={e => setEmail(e.target.value)} disabled={salvando || Boolean(editingId)} /></label>
          <label className="text-sm">Setor<select className="input-field mt-1" value={setor} onChange={e => setSetor(e.target.value)} disabled={salvando}>{Object.entries(setores).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        </div>{editingId && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} disabled={salvando} /> Acesso ativo</label>}
        <div className="flex gap-2"><button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : editingId ? 'Salvar acesso' : 'Cadastrar e enviar acesso'}</button><button type="button" className="btn-secondary" disabled={salvando} onClick={() => setNovo(false)}>Cancelar</button></div>
      </form>}
      {administrador && <form onSubmit={encaminhar} className="card space-y-3 p-5"><h2 className="text-lg font-bold">Encaminhar projeto para um setor</h2>
        <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Projeto<select required className="input-field mt-1" value={projetoId} onChange={e => setProjetoId(e.target.value)}><option value="">Selecione um projeto</option>{projetos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}</select></label>
        <label className="text-sm">Setor<select className="input-field mt-1" value={setorProjeto} onChange={e => setSetorProjeto(e.target.value)}>{Object.entries(setores).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <button type="submit" disabled={salvando || !projetoId} className="btn-primary self-end">Encaminhar</button></div></form>}
      <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
        A presença diária ainda não está registrada no banco. Por isso, esta
        tela mostra apenas o status cadastral real e não inventa presença.
      </div>
      {erro && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <CircleAlert className="h-5 w-5 shrink-0" />
          {erro}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Total cadastrados</span>
            <UserRound className="h-4 w-4 text-cyan-600" />
          </div>
          <b className="mt-2 block text-2xl text-slate-900">{perfis.length}</b>
          <span className="text-xs text-slate-500">Origem: profiles</span>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <span>Ativos</span>
            <CircleCheck className="h-4 w-4" />
          </div>
          <b className="mt-2 block text-2xl text-emerald-800">{ativos}</b>
          <span className="text-xs text-emerald-700">Status cadastral</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Inativos</span>
            <UserX className="h-4 w-4" />
          </div>
          <b className="mt-2 block text-2xl text-slate-700">{inativos}</b>
          <span className="text-xs text-slate-500">Sem presença inventada</span>
        </div>
      </div>
      <section className="card overflow-hidden p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="gestio-section-title">Lista de colaboradores</h2>
            <p className="gestio-section-subtitle">
              Origem: profiles do tenant autenticado.
            </p>
          </div>
          <label className="w-full text-xs font-semibold text-slate-500 sm:w-64">
            Buscar colaborador
            <input
              aria-label="Buscar colaborador"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Nome, e-mail ou perfil"
              className="input-field mt-1"
            />
          </label>
        </div>
        {carregando ? (
          <p className="py-8 text-sm text-slate-500">Carregando equipe...</p>
        ) : !perfis.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Nenhum colaborador disponível para este usuário.
          </div>
        ) : !filtrados.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Nenhum colaborador corresponde à busca.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Perfil</th>
                  <th className="p-3">Setor</th>
                  <th className="p-3">Status cadastral</th>
                  <th className="p-3">Presença</th>
                  {administrador && <th className="p-3">Acessos</th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((perfil) => (
                  <tr key={perfil.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <b>{perfil.nome_completo || "Nome não informado"}</b>
                      <br />
                      <span className="text-xs text-slate-500">
                        {perfil.email || "E-mail não informado"}
                      </span>
                    </td>
                    <td className="p-3">
                      {perfil.cargo || perfil.papel || "Perfil não informado"}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {isSetor(perfil.setor) ? setores[perfil.setor] : 'Não informado no cadastro'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${perfil.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {perfil.suspenso ? 'Suspenso' : !perfil.ativo ? 'Inativo' : limits?.suspended_ids.includes(perfil.id) ? 'Suspenso pelo plano' : 'Ativo'}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      Presença não registrada
                    </td>
                    {administrador && <td className="p-3"><div className="flex flex-wrap gap-2">
                      {limits && perfil.id !== limits.owner_id && <button className="btn-secondary" onClick={() => { setEditingId(perfil.id); setNome(perfil.nome_completo || ''); setEmail(perfil.email || ''); setSetor(perfil.setor || 'corte'); setEditActive(Boolean(perfil.ativo)); setNovo(true); }}>Editar acesso</button>}
                      {limits&&perfil.id!==limits.owner_id&&limits.owner_id===usuario?.usuarioId&&<button className="btn-secondary" onClick={()=>{setNovo(false);setAccessUser(perfil.id);}}>Setores e permissões</button>}
                      <button className="btn-secondary" onClick={() => setDeviceUser(perfil.id)}>Dispositivos</button>
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {administrador && <><h2 className="text-lg font-bold">{deviceUser ? `Dispositivos de ${perfis.find(p => p.id === deviceUser)?.nome_completo || 'colaborador'}` : 'Meus dispositivos'}</h2><DeviceManager key={deviceUser || 'self'} userId={deviceUser} />
      <section className="card p-5"><h2 className="text-lg font-bold">Histórico de acessos</h2><ul className="mt-3 space-y-2 text-sm">{audit.slice(0,10).map(a => <li key={a.id}>{new Date(a.created_at).toLocaleString('pt-BR')} · {actionLabels[a.action] || a.action}{a.subject_id ? ` · ${perfis.find(p => p.id === a.subject_id)?.nome_completo || 'Colaborador'}` : ''}</li>)}</ul>{!audit.length && <p className="mt-2 text-sm text-slate-500">Nenhuma alteração registrada.</p>}</section></>}
    </div>
  );
}

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
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
  identificador_interno: string | null;
  suspenso: boolean;
};
const isPerfil=(value:unknown):value is Perfil=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&row.id.length>0&&(row.nome_completo===null||typeof row.nome_completo==='string')&&(row.email===null||typeof row.email==='string')&&(row.papel===null||typeof row.papel==='string')&&(row.ativo===null||typeof row.ativo==='boolean')&&(row.setor===null||isSetor(String(row.setor)))&&(row.cargo===null||typeof row.cargo==='string')&&(row.identificador_interno===null||typeof row.identificador_interno==='string')&&typeof row.suspenso==='boolean';
};
type Limits = { plan: string; sublogin_limit: number; device_limit: number; sublogins_active: number; sublogins_available: number; sublogins_suspended: number; owner_id: string; suspended_ids: string[] };
const isLimits=(value:unknown):value is Limits=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return typeof row.plan==='string'&&row.plan.length>0&&typeof row.owner_id==='string'&&row.owner_id.length>0&&['sublogin_limit','device_limit','sublogins_active','sublogins_available','sublogins_suspended'].every(key=>Number.isSafeInteger(row[key])&&Number(row[key])>=0)&&Array.isArray(row.suspended_ids)&&row.suspended_ids.every(item=>typeof item==='string');
};
const actionLabels: Record<string,string> = {account_created:'Conta criada',account_changed:'Acesso alterado',device_authorized:'Dispositivo autorizado',device_revoked:'Dispositivo revogado',plan_changed:'Plano alterado',plan_limits_changed:'Limites do plano alterados'};
const isAudit=(value:unknown):value is {id:number;action:string;subject_id:string|null;created_at:string}=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Number.isSafeInteger((value as Record<string,unknown>).id)&&typeof (value as Record<string,unknown>).action==='string'&&String((value as Record<string,unknown>).action).length>0&&((value as Record<string,unknown>).subject_id===null||typeof (value as Record<string,unknown>).subject_id==='string')&&typeof (value as Record<string,unknown>).created_at==='string');
const formatAuditDate=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Data não informada':date.toLocaleString('pt-BR');};
const normalizeSearch=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const isProjeto=(value:unknown):value is {id:string;titulo:string}=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&typeof (value as Record<string,unknown>).id==='string'&&String((value as Record<string,unknown>).id).length>0&&typeof (value as Record<string,unknown>).titulo==='string'&&String((value as Record<string,unknown>).titulo).trim().length>0);

export default function EquipeView() {
  const { usuario } = useAuthStore();
  const employeeFormId = useId();
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [identificadorInterno, setIdentificadorInterno] = useState('');
  const [setor, setSetor] = useState('corte');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [projetoId, setProjetoId] = useState('');
  const [projetos, setProjetos] = useState<{id: string; titulo: string}[]>([]);
  const [projetosCarregando, setProjetosCarregando] = useState(false);
  const [projetosErro, setProjetosErro] = useState('');
  const projetosGeneration = useRef(0);
  const [setorProjeto, setSetorProjeto] = useState('corte');
  const administrador = podeCadastrarFuncionario(usuario?.papel);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editActive, setEditActive] = useState(true);
  const [deviceUser, setDeviceUser] = useState<string | undefined>();
  const [audit, setAudit] = useState<{id: number;action: string;subject_id: string | null;created_at: string}[]>([]);
  const [accessUser,setAccessUser]=useState<string|null>(null);
  const [encaminhando,setEncaminhando]=useState(false);
  const lastReturnRefresh = useRef(0);
  const loadGeneration = useRef(0);
  const cadastrar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (salvando || encaminhando) return;
    setSalvando(true); setErro(null); setSucesso('');
    try {
      if (!limits || limits.sublogins_available <= 0) throw new Error('Limite de sublogins atingido ou indisponível. Atualize a tela ou veja as opções de upgrade.');
      const { data, error } = await supabase.functions.invoke('cadastrar-funcionario', {
        body: { nome: nome.trim(), email: email.trim(), setor, cargo: cargo.trim(), identificador_interno: identificadorInterno.trim() },
      });
      if (error || !data?.success) {
        const fallback = data?.error || 'Não foi possível cadastrar. Tente novamente mais tarde.';
        throw new Error(await mensagemErroFuncao(error, fallback));
      }
      setSucesso('Funcionário cadastrado. O link para definir a senha foi enviado por e-mail.');
      setNovo(false); setNome(''); setEmail(''); setCargo(''); setIdentificadorInterno('');
      await carregar();
    } catch (error) { setErro(error instanceof Error ? error.message : 'Falha ao cadastrar funcionário.'); }
    finally { setSalvando(false); }
  };
  const encaminhar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (salvando || encaminhando) return;
    setSalvando(true); setEncaminhando(true); setErro(null); setSucesso('');
    try {
      const { error } = await supabase.rpc('encaminhar_projeto_setor', { p_projeto_id: projetoId, p_setor: setorProjeto });
      if (error) throw error;
      setSucesso('Projeto encaminhado para o painel do setor.'); setProjetoId('');
    } catch { setErro('Não foi possível encaminhar o projeto. Verifique o projeto e a sua permissão.'); }
    finally { setEncaminhando(false); setSalvando(false); }
  };
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const carregar = async () => {
    const request = ++loadGeneration.current;
    const current = () => request === loadGeneration.current;
    setCarregando(true);
    setErro(null);
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      if (!current()) return;
      setErro("Sessão sem empresa vinculada. Faça login novamente.");
      setPerfis([]);
      setCarregando(false);
      return;
    }
    try {
    let query = supabase
      .from("profiles")
      .select("id,nome_completo,email,papel,ativo,setor,cargo,identificador_interno,suspenso")
      .order("nome_completo");
    query = query.eq("tenant_id", tenantId);
    const result = await query;
    if (!current()) return;
    if (result.error) {
      setErro(
        "A equipe não pôde ser carregada. Verifique a permissão do administrador da empresa.",
      );
    } else if (!Array.isArray(result.data) || !result.data.every(isPerfil)) {
      setErro('A equipe retornou dados inválidos. Atualize a página.');
    } else setPerfis(result.data);
    if (administrador) {
      try {
        const [quota, history] = await Promise.all([supabase.rpc('limites_acesso'), supabase.rpc('historico_acessos')]);
        if (!current()) return;
        if (quota.error) throw quota.error;
        if (!isLimits(quota.data)) throw new Error('Resposta de limites inválida.');
        setLimits(quota.data);
        if (!history.error && Array.isArray(history.data) && history.data.every(isAudit)) setAudit(history.data);
      } catch { if (current()) { setLimits(null); setErro('Não foi possível consultar os limites do plano. Atualize a página.'); } }
    }
    } catch { if (current()) setErro('Não foi possível carregar a equipe. Confira sua conexão e tente novamente.'); }
    finally { if (current()) setCarregando(false); }
  };
  useEffect(() => {
    void carregar();
  }, [administrador, usuario?.tenantId]);
  useEffect(() => {
    const refreshOnReturn = () => { if (salvando || encaminhando) return; const now = Date.now(); if (document.visibilityState === 'visible' && now - lastReturnRefresh.current > 1000) { lastReturnRefresh.current = now; void carregar(); } };
    window.addEventListener('focus', refreshOnReturn); document.addEventListener('visibilitychange', refreshOnReturn);
    return () => { window.removeEventListener('focus', refreshOnReturn); document.removeEventListener('visibilitychange', refreshOnReturn); };
  }, [administrador, usuario?.tenantId, salvando, encaminhando]);
  useEffect(() => {
    if (!administrador || !usuario?.tenantId) return;
    let mounted = true;
    const request = ++projetosGeneration.current;
    const current = () => mounted && request === projetosGeneration.current;
    setProjetosCarregando(true); setProjetosErro(''); setProjetos([]); setProjetoId('');
    Promise.resolve(supabase.from('projetos_marcenaria').select('id,titulo').eq('tenant_id', usuario.tenantId).order('titulo'))
      .then(({ data, error }) => {
        if (!current()) return;
        if (error) { setProjetosErro('Não foi possível carregar os projetos. Tente novamente.'); return; }
        if (!Array.isArray(data) || !data.every(isProjeto)) { setProjetosErro('A lista de projetos retornou dados inválidos.'); return; }
        setProjetos(data);
      }).catch(() => { if (current()) setProjetosErro('Não foi possível carregar os projetos. Tente novamente.'); })
      .finally(() => { if (current()) setProjetosCarregando(false); });
    return () => { mounted = false; };
  }, [administrador, usuario?.tenantId]);

  const recarregarProjetos = () => {
    if (!administrador || !usuario?.tenantId) return;
    const request = ++projetosGeneration.current;
    setProjetosCarregando(true); setProjetosErro('');
    Promise.resolve(supabase.from('projetos_marcenaria').select('id,titulo').eq('tenant_id', usuario.tenantId).order('titulo'))
      .then(({ data, error }) => { if (request !== projetosGeneration.current) return; if (error) throw error; if (!Array.isArray(data) || !data.every(isProjeto)) throw new Error('A lista de projetos retornou dados inválidos.'); setProjetos(data); setProjetoId(''); })
      .catch(() => { if (request === projetosGeneration.current) setProjetosErro('Não foi possível carregar os projetos. Tente novamente.'); })
      .finally(() => { if (request === projetosGeneration.current) setProjetosCarregando(false); });
  };

  const ativos = perfis.filter((perfil) => perfil.ativo && !perfil.suspenso && !limits?.suspended_ids.includes(perfil.id)).length;
  const inativos = perfis.filter((perfil) => perfil.ativo === false).length;
  const suspensos = perfis.filter((perfil) => perfil.suspenso || limits?.suspended_ids.includes(perfil.id)).length;
  const filtrados = useMemo(() => {
    const termo = normalizeSearch(busca.trim());
    if (!termo) return perfis;
    return perfis.filter((perfil) =>
      [perfil.nome_completo, perfil.email, perfil.papel, perfil.cargo, perfil.identificador_interno, isSetor(perfil.setor) ? setores[perfil.setor] : perfil.setor]
        .filter(Boolean)
        .some((valor) => normalizeSearch(String(valor)).includes(termo)),
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
        {administrador && <button type="button" className="btn-primary w-full sm:w-auto" aria-label="Cadastrar novo funcionário" title={salvando || encaminhando ? 'Aguarde a operação em andamento' : !limits ? 'Carregando limite do plano' : limits.sublogins_available <= 0 ? 'Limite de sublogins atingido' : undefined} disabled={salvando || encaminhando || !limits || limits.sublogins_available <= 0} onClick={() => { setEditingId(null); setNome(''); setEmail(''); setCargo(''); setIdentificadorInterno(''); setSetor('corte'); setNovo(true); setSucesso(''); }}>Novo funcionário</button>}
        <button
          type="button"
          aria-label={carregando || salvando || encaminhando ? 'Aguarde a operação em andamento' : 'Atualizar equipe'}
          onClick={() => void carregar()}
          disabled={carregando || salvando || encaminhando}
          className="btn-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
        </div>
      </header>
      {administrador && limits && <section className="card space-y-2 p-5" aria-labelledby="plan-access-title">
        <h2 id="plan-access-title" className="text-lg font-bold">Acessos do plano {limits.plan}</h2>
        <div role="group" aria-live="polite" aria-label={`Uso de sublogins: ${subloginsUsados} de ${limits.sublogin_limit} utilizados`} className="space-y-1">
          <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{subloginsUsados} de {limits.sublogin_limit} sublogins utilizados</span><span>{limits.sublogins_available} disponíveis · {limits.device_limit} dispositivo(s) por login</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={limits.sublogin_limit} aria-valuenow={subloginsUsados} aria-valuetext={`${subloginPercentual}% utilizado`}><div className={`h-full rounded-full ${subloginPercentual >= 100 ? 'bg-rose-500' : subloginPercentual >= 80 ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ width: `${subloginPercentual}%` }} /></div>
        </div>
        <p className="text-sm text-slate-500">A conta principal não ocupa uma vaga. No downgrade, os cadastros mais antigos permanecem liberados.</p>
        {limits.sublogins_suspended > 0 && <p role="status" className="text-sm text-amber-700">{limits.sublogins_suspended} funcionário(s) suspenso(s) pelo limite do plano.</p>}
        {limits.sublogins_available === 0 && <p className="text-sm text-amber-700">Limite atingido. Desative um funcionário ou amplie seu plano.</p>}
        <Link to="/configuracoes?tab=assinatura" className="inline-block text-sm font-semibold text-cyan-700">Ver planos e opções de upgrade →</Link>
      </section>}
      {sucesso && <p role="status" aria-live="polite" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{sucesso}</p>}
      {accessUser&&<EmployeeAccessEditor userId={accessUser} onCancel={()=>setAccessUser(null)} onSaved={()=>{setAccessUser(null);setSucesso('Setores e permissões atualizados.');void carregar();}}/>}
      {novo && administrador && <form onSubmit={cadastrar} className="card space-y-4 p-5" aria-labelledby={`${employeeFormId}-title`}>
        <h2 id={`${employeeFormId}-title`} className="text-lg font-bold">{editingId ? 'Editar funcionário' : 'Cadastrar funcionário'}</h2>
        <p className="text-sm text-slate-500">O funcionário recebe acesso somente ao setor escolhido e define a própria senha por e-mail.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm" htmlFor={`${employeeFormId}-name`}>Nome completo<input id={`${employeeFormId}-name`} required minLength={2} maxLength={120} autoComplete="name" className="input-field mt-1" value={nome} onChange={e => setNome(e.target.value)} disabled={salvando} /></label>
          <label className="text-sm" htmlFor={`${employeeFormId}-email`}>E-mail<input id={`${employeeFormId}-email`} required type="email" maxLength={254} autoComplete="email" className="input-field mt-1" value={email} onChange={e => setEmail(e.target.value)} disabled={salvando || Boolean(editingId)} /></label>
          {!editingId && <><label className="text-sm" htmlFor={`${employeeFormId}-job`}>Cargo ou função<input id={`${employeeFormId}-job`} className="input-field mt-1" maxLength={120} value={cargo} onChange={e => setCargo(e.target.value)} /></label><label className="text-sm" htmlFor={`${employeeFormId}-internal-id`}>Identificador interno<input id={`${employeeFormId}-internal-id`} className="input-field mt-1" maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._/-]{0,39}" placeholder="Ex.: FUNC-001" value={identificadorInterno} onChange={e => setIdentificadorInterno(e.target.value)} /><span className="mt-1 block text-xs text-slate-500">Opcional e único na empresa.</span></label></>}
          <label className="text-sm" htmlFor={`${employeeFormId}-sector`}>Setor<select id={`${employeeFormId}-sector`} className="input-field mt-1" value={setor} onChange={e => setSetor(e.target.value)} disabled={salvando}>{Object.entries(setores).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        </div>{editingId && <label className="flex items-center gap-2 text-sm" htmlFor={`${employeeFormId}-active`}><input id={`${employeeFormId}-active`} type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} disabled={salvando} /> Acesso ativo</label>}
        <div className="flex flex-col gap-2 sm:flex-row"><button type="submit" className="btn-primary w-full sm:w-auto" aria-label={salvando ? 'Salvando funcionário' : editingId ? 'Salvar acesso do funcionário' : 'Cadastrar funcionário e enviar acesso'} disabled={salvando}>{salvando ? 'Salvando…' : editingId ? 'Salvar acesso' : 'Cadastrar e enviar acesso'}</button><button type="button" className="btn-secondary w-full sm:w-auto" aria-label="Cancelar cadastro ou edição do funcionário" disabled={salvando} onClick={() => setNovo(false)}>Cancelar</button></div>
      </form>}
      {administrador && <form onSubmit={encaminhar} className="card space-y-3 p-5" aria-busy={encaminhando}><h2 className="text-lg font-bold">Encaminhar projeto para um setor</h2>
        <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Projeto<select required className="input-field mt-1" value={projetoId} onChange={e => setProjetoId(e.target.value)} disabled={projetosCarregando || !!projetosErro}><option value="">{projetosCarregando ? 'Carregando projetos…' : projetosErro ? 'Projetos indisponíveis' : 'Selecione um projeto'}</option>{projetos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}</select></label>
        <label className="text-sm">Setor<select className="input-field mt-1" value={setorProjeto} onChange={e => setSetorProjeto(e.target.value)}>{Object.entries(setores).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <button type="submit" aria-label={encaminhando ? 'Encaminhando projeto para o setor selecionado' : salvando ? 'Aguarde a operação em andamento' : 'Encaminhar projeto para o setor selecionado'} disabled={salvando || encaminhando || projetosCarregando || !!projetosErro || !projetoId} className="btn-primary w-full sm:w-auto sm:self-end">{encaminhando ? 'Encaminhando…' : 'Encaminhar'}</button></div>{projetosErro ? <p role="alert" className="flex flex-col gap-2 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"><span>{projetosErro}</span><button type="button" className="btn-secondary w-full sm:w-auto" aria-label="Tentar carregar projetos novamente" onClick={recarregarProjetos} disabled={projetosCarregando}>Tentar novamente</button></p> : !projetosCarregando && !projetos.length && <p className="text-sm text-slate-500">Nenhum projeto disponível para encaminhamento.</p>}</form>}
      <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
        A presença diária ainda não está registrada no banco. Por isso, esta
        tela mostra apenas o status cadastral real e não inventa presença.
      </div>
      {erro && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <span className="flex items-center gap-2"><CircleAlert className="h-5 w-5 shrink-0" />{erro}</span>
          <button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" aria-label="Tentar carregar a equipe novamente" disabled={carregando} onClick={() => void carregar()}>Tentar novamente</button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
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
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-amber-700">
            <span>Suspensos</span>
            <UserX className="h-4 w-4" />
          </div>
          <b className="mt-2 block text-2xl text-amber-800">{suspensos}</b>
          <span className="text-xs text-amber-700">Acesso bloqueado</span>
        </div>
      </div>
      <section id="team-list-results" className="card overflow-hidden p-5" aria-labelledby="team-list-title" aria-busy={carregando}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="team-list-title" className="gestio-section-title">Lista de colaboradores</h2>
            <p className="gestio-section-subtitle">
              Origem: profiles do tenant autenticado.
            </p>
          </div>
          <label className="w-full text-xs font-semibold text-slate-500 sm:w-64">
            Buscar colaborador
            <input
              type="search"
              aria-label="Buscar colaborador"
              aria-controls="team-list-results"
              maxLength={120}
              autoComplete="off"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); setBusca(''); } }}
              placeholder="Nome, e-mail ou perfil"
              className="input-field mt-1"
            />
          </label>
        </div>
        {!carregando && <p className="mb-3 text-xs text-slate-500" role="status" aria-live="polite">{busca ? `${filtrados.length} ${filtrados.length === 1 ? 'colaborador corresponde' : 'colaboradores correspondem'} à busca.` : `${perfis.length} ${perfis.length === 1 ? 'colaborador disponível' : 'colaboradores disponíveis'}.`}</p>}
        {carregando && perfis.length > 0 && <p role="status" aria-live="polite" className="mb-3 text-sm text-cyan-700">Atualizando equipe…</p>}
        {carregando && !perfis.length ? (
          <p role="status" aria-live="polite" className="py-8 text-sm text-slate-500">Carregando equipe...</p>
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
              <caption className="sr-only">Colaboradores cadastrados e seus acessos</caption>
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="p-3">Colaborador</th>
                  <th scope="col" className="p-3">Perfil</th>
                  <th scope="col" className="p-3">Setor</th>
                  <th scope="col" className="p-3">Status cadastral</th>
                  <th scope="col" className="p-3">Presença</th>
                  {administrador && <th scope="col" className="p-3">Acessos</th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((perfil) => (
                  <tr key={perfil.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <b className="break-words">{perfil.nome_completo || "Nome não informado"}</b>
                      <br />
                      <span className="break-all text-xs text-slate-500">{perfil.email || "E-mail não informado"}</span>
                      {perfil.identificador_interno && <span className="mt-1 block break-words text-xs font-semibold text-cyan-700">ID interno: {perfil.identificador_interno}</span>}
                    </td>
                    <td className="p-3">
                      <span className="break-words">{perfil.cargo || perfil.papel || "Perfil não informado"}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {isSetor(perfil.setor) ? setores[perfil.setor] : 'Não informado no cadastro'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${perfil.suspenso || limits?.suspended_ids.includes(perfil.id) ? "bg-amber-50 text-amber-700" : perfil.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {perfil.suspenso ? 'Suspenso' : !perfil.ativo ? 'Inativo' : limits?.suspended_ids.includes(perfil.id) ? 'Suspenso pelo plano' : 'Ativo'}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      Presença não registrada
                    </td>
                    {administrador && <td className="p-3"><div className="flex flex-wrap gap-2">
                      {limits && perfil.id !== limits.owner_id && limits.owner_id === usuario?.usuarioId && <button type="button" className="btn-secondary" aria-label={`Editar acesso de ${perfil.nome_completo || 'colaborador'}`} onClick={() => { setNovo(false); setAccessUser(perfil.id); }}>Editar acesso</button>}
                      {limits && limits.owner_id === usuario?.usuarioId && <button type="button" className="btn-secondary" aria-label={`Gerenciar dispositivos de ${perfil.nome_completo || 'colaborador'}`} onClick={() => setDeviceUser(perfil.id)}>Dispositivos</button>}
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {administrador && <><h2 className="text-lg font-bold">{deviceUser ? `Dispositivos de ${perfis.find(p => p.id === deviceUser)?.nome_completo || 'colaborador'}` : 'Meus dispositivos'}</h2><DeviceManager key={deviceUser || 'self'} userId={deviceUser} />
      <section className="card p-5" aria-labelledby="access-history-title"><h2 id="access-history-title" className="text-lg font-bold">Histórico de acessos</h2><ul className="mt-3 space-y-2 text-sm">{audit.slice(0,10).map(a => <li key={a.id} className="break-words">{formatAuditDate(a.created_at)} · {actionLabels[a.action] || a.action}{a.subject_id ? ` · ${perfis.find(p => p.id === a.subject_id)?.nome_completo || 'Colaborador'}` : ''}</li>)}</ul>{!carregando&&!audit.length && <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-500">Nenhuma alteração registrada.</p>}</section></>}
    </div>
  );
}


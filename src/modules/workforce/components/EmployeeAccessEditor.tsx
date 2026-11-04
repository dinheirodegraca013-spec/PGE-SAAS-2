import React, { useEffect, useState } from 'react';
import { setores } from '@/lib/setores';
import { workforceAccess } from '../services/access.service';
import { moduleLabels, permissionLabels } from '../lib/access';
import type { AccessGrant, EmployeeConfiguration, RecordScope } from '../types/access';

export default function EmployeeAccessEditor({ userId,onSaved,onCancel }: {userId:string;onSaved:()=>void;onCancel:()=>void}) {
  const [employee,setEmployee] = useState<EmployeeConfiguration|null>(null);
  const [catalog,setCatalog] = useState<{modulo:string;operacao:string}[]>([]);
  const [name,setName] = useState(''); const [job,setJob] = useState(''); const [sector,setSector] = useState('corte');
  const [additional,setAdditional] = useState<string[]>([]); const [status,setStatus] = useState('ativo');
  const [grants,setGrants] = useState<AccessGrant[]>([]); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  useEffect(() => {
    let mounted=true; setEmployee(null);setError('');
    Promise.all([workforceAccess.employee(userId),workforceAccess.context()]).then(([p,ctx])=>{
      if(!mounted)return;
      if(!ctx.proprietario)throw new Error('Somente o proprietário pode editar estas permissões.');
      setEmployee(p);setCatalog(ctx.catalogo_permissoes||[]);setName(p.nome);setJob(p.cargo||'');setSector(p.setor||'corte');setAdditional(p.setores_adicionais);setStatus(p.status==='suspenso_plano'?'ativo':p.status);setGrants(p.permissoes);
    }).catch(e=>{if(mounted)setError(e.message||'Não foi possível carregar o funcionário.');});
    return()=>{mounted=false;};
  },[userId]);
  const toggle=(module:string,operation:string,enabled:boolean)=>setGrants(current=>enabled?[...current,{modulo:module,operacao:operation,escopo:module==='estoque'?'setor':'atribuidos'}]:current.filter(g=>g.modulo!==module||g.operacao!==operation));
  async function save(event:React.FormEvent){
    event.preventDefault();if(!employee||busy)return;setBusy(true);setError('');
    try{await workforceAccess.save({id:employee.id,nome:name,cargo:job,setor:sector,setores_adicionais:additional,status,permissoes:grants,versao:employee.versao});onSaved();}
    catch(e){setError((e as Error).message||'Não foi possível salvar.');}finally{setBusy(false);}
  }
  return <section className="card space-y-4 p-5">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Acesso do funcionário</h2><button className="btn-secondary" disabled={busy} onClick={onCancel}>Fechar</button></div>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {!employee&&!error&&<p role="status">Carregando acesso…</p>}
    {employee&&<form className="space-y-5" onSubmit={save}>
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Nome completo<input className="input-field mt-1" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
          <label className="text-sm">Cargo ou função<input className="input-field mt-1" maxLength={120} value={job} onChange={e=>setJob(e.target.value)}/></label>
          <label className="text-sm">Setor principal<select className="input-field mt-1" value={sector} onChange={e=>{setSector(e.target.value);setAdditional(current=>current.filter(s=>s!==e.target.value));}}>{Object.entries(setores).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label className="text-sm">Situação do acesso<select className="input-field mt-1" value={status} onChange={e=>setStatus(e.target.value)}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="suspenso">Suspenso</option></select></label>
        </div>
        {employee.status==='suspenso_plano'&&<p className="text-sm text-amber-700">Este acesso também está sujeito ao limite do plano. Alterar permissões não amplia a quantidade contratada.</p>}
        <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold">Setores adicionais autorizados</legend><div className="flex flex-wrap gap-4">{Object.entries(setores).filter(([id])=>id!==sector).map(([id,label])=><label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={additional.includes(id)} onChange={e=>setAdditional(current=>e.target.checked?[...current,id]:current.filter(s=>s!==id))}/>{label}</label>)}</div></fieldset>
        <div><h3 className="font-semibold">Permissões por módulo e operação</h3><p className="mt-1 text-sm text-slate-500">Autorize cada ação e escolha quais registros podem ser acessados. O acesso administrativo não libera o financeiro automaticamente.</p></div>
        <div className="space-y-2">{[...new Set(catalog.map(c=>c.modulo))].map(module=><details key={module} className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer font-semibold">{moduleLabels[module]||module} <span className="text-xs font-normal text-slate-500">({grants.filter(g=>g.modulo===module).length} ações)</span></summary>
          <div className="mt-3 space-y-3">{catalog.filter(c=>c.modulo===module).map(c=>{const grant=grants.find(g=>g.modulo===c.modulo&&g.operacao===c.operacao);return <div key={c.operacao} className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(grant)} onChange={e=>toggle(module,c.operacao,e.target.checked)}/>{permissionLabels[c.operacao]||c.operacao}</label>{grant&&<label className="text-xs text-slate-500"><span className="sr-only">Escopo de {permissionLabels[c.operacao]||c.operacao} em {moduleLabels[module]||module}</span><select className="input-field py-1 text-xs" value={grant.escopo} onChange={e=>setGrants(current=>current.map(g=>g===grant?{...g,escopo:e.target.value as RecordScope}:g))}><option value="atribuidos">Atribuídos ao funcionário</option><option value="setor">Setores autorizados</option><option value="empresa">Registros autorizados da empresa</option></select></label>}</div>;})}</div>
        </details>)}</div>
        <p className="text-xs text-slate-500">Identificador: {employee.id} · Cadastro: {new Date(employee.created_at).toLocaleDateString('pt-BR')} · Último acesso: {employee.ultimo_acesso?new Date(employee.ultimo_acesso).toLocaleString('pt-BR'):'Ainda não registrado'}</p>
        <button type="submit" className="btn-primary" disabled={busy}>{busy?'Salvando…':'Salvar setores e permissões'}</button>
      </fieldset>
    </form>}
  </section>;
}

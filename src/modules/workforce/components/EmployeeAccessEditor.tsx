import React, { useEffect, useId, useState } from 'react';
import { setores } from '@/lib/setores';
import { workforceAccess } from '../services/access.service';
import { moduleLabels, permissionLabels } from '../lib/access';
import type { AccessGrant, EmployeeConfiguration, RecordScope } from '../types/access';

const formatEmployeeDate=(value:string,withTime=false)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Data não informada':date.toLocaleString('pt-BR',withTime?undefined:{dateStyle:'short'});};
const validSector=(value:string)=>Object.prototype.hasOwnProperty.call(setores,value)?value:'corte';
const validStatus=(value:string)=>['ativo','inativo','suspenso','suspenso_plano'].includes(value)?value:'ativo';
const validScope=(value:string):RecordScope=>['atribuidos','setor','empresa'].includes(value)?value as RecordScope:'atribuidos';

export default function EmployeeAccessEditor({ userId,onSaved,onCancel }: {userId:string;onSaved:()=>void;onCancel:()=>void}) {
  const [employee,setEmployee] = useState<EmployeeConfiguration|null>(null);
  const [catalog,setCatalog] = useState<{modulo:string;operacao:string}[]>([]);
  const [name,setName] = useState(''); const [job,setJob] = useState(''); const [internalId,setInternalId] = useState(''); const [sector,setSector] = useState('corte');
  const [additional,setAdditional] = useState<string[]>([]); const [status,setStatus] = useState('ativo');
  const [grants,setGrants] = useState<AccessGrant[]>([]); const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [retry,setRetry] = useState(0);
  const fieldId=useId();
  const clearError=()=>setError('');
  useEffect(() => {
    let mounted=true; setEmployee(null);setError('');
    Promise.all([workforceAccess.employee(userId),workforceAccess.context()]).then(([p,ctx])=>{
      if(!mounted)return;
      if(!ctx.proprietario)throw new Error('Somente o proprietário pode editar estas permissões.');
      setEmployee(p);setCatalog(ctx.catalogo_permissoes||[]);setName(p.nome||'');setJob(p.cargo||'');setInternalId(p.identificador_interno||'');const primary=validSector(p.setor||'corte');setSector(primary);setAdditional(Array.isArray(p.setores_adicionais)?p.setores_adicionais.filter(value=>value!==primary&&Object.prototype.hasOwnProperty.call(setores,value)):[]);setStatus(validStatus(p.status||'ativo'));setGrants(Array.isArray(p.permissoes)?p.permissoes.map(grant=>({...grant,escopo:validScope(grant.escopo)})):[]);
    }).catch(e=>{if(mounted)setError(e instanceof Error&&e.message?e.message:typeof e==='string'?e:'Não foi possível carregar o funcionário.');});
    return()=>{mounted=false;};
  },[userId,retry]);
  const toggle=(module:string,operation:string,enabled:boolean)=>{clearError();setGrants(current=>enabled?[...current,{modulo:module,operacao:operation,escopo:module==='estoque'?'setor':'atribuidos'}]:current.filter(g=>g.modulo!==module||g.operacao!==operation));};
  async function save(event:React.FormEvent){
    event.preventDefault();if(!employee||busy)return;setBusy(true);setError('');
    try{await workforceAccess.save({id:employee.id,nome:name,cargo:job,identificador_interno:internalId,setor:sector,setores_adicionais:additional,status,permissoes:grants,versao:employee.versao});onSaved();}
    catch(e){setError(e instanceof Error&&e.message?e.message:typeof e==='string'?e:'Não foi possível salvar.');}finally{setBusy(false);}
  }
  return <section className="card space-y-4 p-5" aria-labelledby="employee-access-title" aria-busy={busy || (!employee && !error)}>
    <div className="flex items-center justify-between gap-3"><h2 id="employee-access-title" className="text-lg font-bold">Acesso do funcionário</h2><button type="button" className="btn-secondary" disabled={busy} onClick={onCancel} aria-label="Fechar edição do funcionário">Fechar</button></div>
    {error&&<div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><span>{error}</span><button type="button" className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100" aria-label="Tentar carregar o acesso novamente" onClick={()=>setRetry(value=>value+1)}>Tentar novamente</button></div>}
    {!employee&&!error&&<p role="status" aria-live="polite">Carregando acesso…</p>}
    {employee&&<form className="space-y-5" onSubmit={save}>
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm" htmlFor={`${fieldId}-name`}>Nome completo<input id={`${fieldId}-name`} className="input-field mt-1" required minLength={2} maxLength={120} value={name} onChange={e=>{setName(e.target.value);clearError();}}/></label>
          <label className="text-sm" htmlFor={`${fieldId}-job`}>Cargo ou função<input id={`${fieldId}-job`} className="input-field mt-1" maxLength={120} value={job} onChange={e=>{setJob(e.target.value);clearError();}}/></label>
          <label className="text-sm" htmlFor={`${fieldId}-internal-id`}>Identificador interno<input id={`${fieldId}-internal-id`} className="input-field mt-1" maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._/-]{0,39}" value={internalId} onChange={e=>{setInternalId(e.target.value);clearError();}} placeholder="Ex.: FUNC-001"/><span className="mt-1 block text-xs text-slate-500">Opcional; único dentro da empresa.</span></label>
          <label className="text-sm" htmlFor={`${fieldId}-sector`}>Setor principal<select id={`${fieldId}-sector`} className="input-field mt-1" value={sector} onChange={e=>{setSector(e.target.value);setAdditional(current=>current.filter(s=>s!==e.target.value));clearError();}}>{Object.entries(setores).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label className="text-sm" htmlFor={`${fieldId}-status`}>Situação do acesso<select id={`${fieldId}-status`} className="input-field mt-1" value={status} disabled={status==='suspenso_plano'} onChange={e=>{setStatus(e.target.value);clearError();}}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="suspenso">Suspenso</option><option value="suspenso_plano">Suspenso pelo plano</option></select></label>
        </div>
        {employee.status==='suspenso_plano'&&<p className="text-sm text-amber-700">Este acesso também está sujeito ao limite do plano. Alterar permissões não amplia a quantidade contratada.</p>}
        <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold">Setores adicionais autorizados</legend><div className="flex flex-wrap gap-4">{Object.entries(setores).filter(([id])=>id!==sector).map(([id,label])=><label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={additional.includes(id)} onChange={e=>{setAdditional(current=>e.target.checked?[...current,id]:current.filter(s=>s!==id));clearError();}}/>{label}</label>)}</div></fieldset>
        <div><h3 className="font-semibold">Permissões por módulo e operação</h3><p className="mt-1 text-sm text-slate-500">Autorize cada ação e escolha quais registros podem ser acessados. O acesso administrativo não libera o financeiro automaticamente.</p></div>
        <div className="space-y-2">{[...new Set(catalog.map(c=>c.modulo))].map(module=><details key={module} className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer font-semibold">{moduleLabels[module]||module} <span className="text-xs font-normal text-slate-500">({grants.filter(g=>g.modulo===module).length} ações)</span></summary>
          <div className="mt-3 space-y-3">{catalog.filter(c=>c.modulo===module).map(c=>{const grant=grants.find(g=>g.modulo===c.modulo&&g.operacao===c.operacao);return <div key={c.operacao} className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(grant)} onChange={e=>toggle(module,c.operacao,e.target.checked)}/>{permissionLabels[c.operacao]||c.operacao}</label>{grant&&<label className="text-xs text-slate-500"><span className="sr-only">Escopo de {permissionLabels[c.operacao]||c.operacao} em {moduleLabels[module]||module}</span><select className="input-field py-1 text-xs" value={grant.escopo} onChange={e=>{setGrants(current=>current.map(g=>g===grant?{...g,escopo:e.target.value as RecordScope}:g));clearError();}}><option value="atribuidos">Atribuídos ao funcionário</option><option value="setor">Setores autorizados</option><option value="empresa">Registros autorizados da empresa</option></select></label>}</div>;})}</div>
        </details>)}</div>
        <p className="text-xs text-slate-500">ID da conta: {employee.id} · Cadastro: {formatEmployeeDate(employee.created_at)} · Último acesso: {employee.ultimo_acesso?formatEmployeeDate(employee.ultimo_acesso,true):'Ainda não registrado'}</p>
        <button type="submit" className="btn-primary" disabled={busy}>{busy?'Salvando…':'Salvar setores e permissões'}</button>
      </fieldset>
    </form>}
  </section>;
}


import React, { useEffect, useRef, useState } from 'react';
import { useWorkforceAccess } from '../context/WorkforceAccessContext';
import { hasPermission } from '../lib/access';
import { technicalSheets, type FinishingDryingState, type MaterialOption, type MaterialRequest, type ProductionState, type ServiceSheet } from '../services/technical-sheet.service';
import TechnicalSheetForm from './TechnicalSheetForm';
import SheetAssignmentEditor from './SheetAssignmentEditor';
import TaskCreationForm from './TaskCreationForm';
import SheetAttachments from './SheetAttachments';
import SheetIncidents from './SheetIncidents';
import InstallationAcceptanceForm from './InstallationAcceptanceForm';
import {installation} from '../services/installation.service';
import FinishingDryingControl from './FinishingDryingControl';
import ProductionLog from './ProductionLog';
import MaterialRequestPanel from './MaterialRequestPanel';

export default function ServiceTechnicalSheet({ serviceId, sector }: { serviceId: string; sector: string }) {
  const { context } = useWorkforceAccess();
  const [sheet, setSheet] = useState<ServiceSheet | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [checklistBusy, setChecklistBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachmentOptions,setAttachmentOptions] = useState<{id:string;nome:string}[]>([]);
  const [drying, setDrying] = useState<FinishingDryingState | null>(null);
  const [dryingError, setDryingError] = useState('');
  const [production, setProduction] = useState<ProductionState | null>(null);
  const [productionError, setProductionError] = useState('');
  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [materialError, setMaterialError] = useState('');
  const mutation = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const request = ++generation.current;
    setSheet(null); setValues({}); setDrying(null); setDryingError(''); setProduction(null); setProductionError(''); setMaterialOptions([]); setMaterialRequests([]); setMaterialError(''); setError(''); setLoading(true);
    (async () => {
      try {
        const result = await technicalSheets.load(serviceId, sector);
        if (request !== generation.current) return;
        setSheet(result); setValues(result.dados);
        if (sector === 'acabamento') {
          try { setDrying(await technicalSheets.dryingLoad(serviceId)); }
          catch (cause) { if (request === generation.current) setDryingError(cause instanceof Error ? cause.message : 'Não foi possível consultar a secagem.'); }
        }
        if (sector === 'corte' || sector === 'montagem') {
          try { setProduction(await technicalSheets.productionLoad(serviceId, sector)); }
          catch (cause) { if (request === generation.current) setProductionError(cause instanceof Error ? cause.message : 'Não foi possível consultar a produção.'); }
        }
        if (['corte', 'montagem', 'acabamento', 'instalacao'].includes(sector) && hasPermission(context, 'estoque', 'criar')) {
          try { const [options, requests] = await Promise.all([technicalSheets.materialOptions(serviceId, sector), technicalSheets.materialRequests(serviceId, sector)]); if (request === generation.current) { setMaterialOptions(options); setMaterialRequests(requests); } }
          catch (cause) { if (request === generation.current) setMaterialError(cause instanceof Error ? cause.message : 'Não foi possível consultar as solicitações de material.'); }
        }
      } catch (cause) {
        if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a ficha.');
      } finally { if (request === generation.current) setLoading(false); }
    })();
    return () => { generation.current++; };
  }, [serviceId, sector, reload, context?.funcionario.versao]);
  if (loading) return <p role="status">Carregando ficha técnica…</p>;
  if (!sheet) return <div className="space-y-3">
    <p role="alert" className="text-sm text-red-700">{error}</p>
    <button type="button" className="btn-secondary" onClick={() => setReload(n => n + 1)}>Tentar novamente</button>
    {context?.proprietario && <button type="button" className="btn-primary" onClick={async () => {
      setLoading(true); setError('');
      try { await technicalSheets.save(serviceId, sector, {}, 0); setReload(n => n + 1); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível liberar a ficha.'); setLoading(false); }
    }}>Liberar ficha deste setor</button>}
  </div>;
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
      <span className="text-sm font-medium">Situação: {({pendente:'Pendente',em_andamento:'Em andamento',pausada:'Pausada',concluida:'Concluída'})[sheet.status] || 'Pendente'}</span>
      {(['iniciar','pausar','concluir'] as const).filter(action=>sheet.acoes_execucao?.includes(action) && hasPermission(context,'ordens',action) &&
        (action==='iniciar'?['pendente','pausada'].includes(sheet.status):sheet.status==='em_andamento')).map(action=><button key={action} type="button" className="btn-secondary" disabled={saving || checklistBusy || action==='iniciar' && !sheet.inicio_liberado} onClick={async()=>{
          if(mutation.current)return;
          if(action==='iniciar' && !sheet.inicio_liberado)return;
          if(JSON.stringify(values)!==JSON.stringify(sheet.dados)){
            setError('Salve ou descarte as alterações da ficha antes de atualizar a execução.');return;
          }
          if(action==='concluir' && !window.confirm('Concluir esta ficha? Os dados e o checklist ficarão bloqueados para edição.'))return;
          mutation.current=true;setSaving(true);setError('');const request=generation.current;
          try{const result=await technicalSheets.execute(serviceId,sector,action,sheet.versao);if(request===generation.current)setSheet(current=>current?{...current,...result}:current);}
          catch(cause){if(request===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível atualizar a execução.');}
          finally{mutation.current=false;setSaving(false);}
        }}>{action==='iniciar'?(sheet.status==='pausada'?'Retomar':'Iniciar'):action==='pausar'?'Pausar':'Concluir'}</button>)}
    </div>
    {sheet.bloqueio_fluxo && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{sheet.bloqueio_fluxo==='etapa_anterior'?'Aguardando a conclusão das etapas anteriores. Recarregue a ficha após a liberação.':'Este setor não participa do fluxo configurado para o serviço.'}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold">{sheet.modelo.titulo}</h3>
      <button type="button" className="btn-secondary" disabled={saving || checklistBusy} onClick={() => {
        if (JSON.stringify(values) !== JSON.stringify(sheet.dados) && !window.confirm('Descartar alterações não salvas e recarregar a ficha?')) return;
        setReload(n => n + 1);
      }}>Recarregar ficha</button>
    </div>
    {context?.proprietario && <SheetAssignmentEditor serviceId={serviceId} sector={sector} current={sheet.responsavel_id} disabled={saving || checklistBusy} onAssign={async employee=>{
      if(mutation.current)throw new Error('Aguarde o salvamento em andamento.');
      mutation.current=true;setSaving(true);
      const request=generation.current;
      try{
        const result=await technicalSheets.assign(serviceId,sector,employee,sheet.versao);
        if(request===generation.current)setSheet(current=>current?{...current,...result}:current);
      }finally{mutation.current=false;setSaving(false);}
    }} />}
    <TechnicalSheetForm key={`${serviceId}:${sector}:${reload}`} fields={sheet.modelo.campos} value={values} allowedPrivacy={sheet.privacidade_autorizada} attachmentOptions={attachmentOptions} canLinkAttachments={sheet.pode_anexar}
      disabled={!sheet.pode_editar || sheet.status==='concluida' || saving || checklistBusy || !hasPermission(context, 'ordens', 'editar')} onChange={setValues} onSave={async data => {
        if (mutation.current) throw new Error('Aguarde o salvamento em andamento.');
        mutation.current = true; setSaving(true);
        const request = generation.current;
        try {
          const version = await technicalSheets.save(serviceId, sector, data, sheet.versao);
          if (request !== generation.current) return;
          setSheet(current => current ? { ...current, dados: { ...current.dados, ...data }, versao: version } : current);
        } finally { mutation.current = false; setSaving(false); }
      }} />
    {sector === 'acabamento' && <FinishingDryingControl state={drying} error={dryingError} canRegister={drying !== null && sheet.pode_editar && sheet.status === 'em_andamento' && hasPermission(context, 'ordens', 'editar')} disabled={saving || checklistBusy || sheet.status === 'concluida'} onRefresh={() => setReload(n => n + 1)} onRegister={async minutes => {
      if (mutation.current) throw new Error('Aguarde o salvamento em andamento.');
      mutation.current = true; setSaving(true); setDryingError('');
      const request = generation.current;
      try {
        const result = await technicalSheets.dryingRegister(serviceId, minutes, sheet.versao);
        if (request === generation.current) {
          setDrying(current => current ? { ...current, ...result } : current);
          setSheet(current => current ? { ...current, versao: result.versao } : current);
        }
      } finally { mutation.current = false; setSaving(false); }
    }} />}
    {(sector === 'corte' || sector === 'montagem') && <ProductionLog state={production} error={productionError} canRegister={production !== null && sheet.pode_editar && sheet.status !== 'concluida' && hasPermission(context, 'ordens', 'editar')} disabled={saving || checklistBusy || sheet.status === 'concluida'} onRefresh={() => setReload(n => n + 1)} onRegister={async input => {
      if (mutation.current) throw new Error('Aguarde o salvamento em andamento.');
      mutation.current = true; setSaving(true); setProductionError('');
      const request = generation.current;
      try {
        const result = await technicalSheets.productionRegister(serviceId, sector, input, sheet.versao);
        if (request === generation.current) { setProduction(result); setSheet(current => current ? { ...current, versao: result.versao } : current); }
      } finally { mutation.current = false; setSaving(false); }
    }} />}
    {['corte', 'montagem', 'acabamento', 'instalacao'].includes(sector) && hasPermission(context, 'estoque', 'criar') && <MaterialRequestPanel options={materialOptions} requests={materialRequests} error={materialError} canRequest={materialOptions.length > 0 && sheet.status !== 'concluida'} disabled={saving || checklistBusy || sheet.status === 'concluida'} onRefresh={() => setReload(n => n + 1)} onCreate={async input => {
      if (mutation.current) throw new Error('Aguarde o salvamento em andamento.');
      mutation.current = true; setSaving(true); setMaterialError('');
      try { await technicalSheets.materialRequestCreate(serviceId, sector, input); setReload(n => n + 1); }
      finally { mutation.current = false; setSaving(false); }
    }} onCancel={async requestItem => {
      if (mutation.current) throw new Error('Aguarde o salvamento em andamento.');
      mutation.current = true; setSaving(true); setMaterialError('');
      try { const result = await technicalSheets.materialRequestUpdate(requestItem.id, 'cancelar', requestItem.versao); setMaterialRequests(current => current.map(item => item.id === requestItem.id ? { ...item, status: result.status as MaterialRequest['status'], versao: result.versao } : item)); }
      finally { mutation.current = false; setSaving(false); }
    }} />}
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4" disabled={!sheet.pode_editar || sheet.status==='concluida' || saving || checklistBusy || !hasPermission(context, 'ordens', 'editar')}>
      <legend className="px-1 font-semibold">Checklist operacional</legend>
      <p className="text-sm text-slate-500">Cada marcação é salva individualmente.</p>
      {sheet.modelo.checklist.map(item => <label key={item.key} className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={sheet.checklist[item.key] === true} disabled={item.automatic} onChange={async event => {
          if (mutation.current) return;
          mutation.current = true;
          const checked = event.target.checked;
          const request = generation.current;
          setChecklistBusy(true); setError('');
          try {
            const result = await technicalSheets.checklist(serviceId, sector, {[item.key]:checked}, sheet.versao);
            if (request === generation.current) setSheet(current => current ? {...current,...result} : current);
          } catch (cause) { if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o checklist.'); }
          finally { mutation.current = false; setChecklistBusy(false); }
        }} />
        <span>{item.label}{item.automatic && <span className="block text-xs text-slate-500">Atualizado após registro da evidência.</span>}</span>
      </label>)}
    </fieldset>
    <SheetAttachments serviceId={serviceId} sector={sector} canUpload={sheet.pode_anexar && sheet.status!=='concluida'} onListed={setAttachmentOptions}/>
    {sector==='instalacao' && sheet.checklist.aceite_cliente && <p role="status" className="text-sm text-emerald-800">Aceite da instalação registrado com comprovante.</p>}
    {sector==='instalacao' && !sheet.checklist.aceite_cliente && sheet.status==='em_andamento' && sheet.acoes_execucao.includes('concluir') && <InstallationAcceptanceForm attachments={attachmentOptions} disabled={saving || checklistBusy || JSON.stringify(values)!==JSON.stringify(sheet.dados)} onRegister={async input=>{
      if(mutation.current)throw new Error('Aguarde o salvamento em andamento.');
      mutation.current=true;setSaving(true);
      try{await installation.accept(serviceId,sheet.versao,input);setReload(n=>n+1);}
      finally{mutation.current=false;setSaving(false);}
    }}/>}
    <SheetIncidents serviceId={serviceId} sector={sector} canCreate={sheet.pode_comunicar}/>
    {sheet.status!=='concluida' && <TaskCreationForm serviceId={serviceId} sector={sector}/>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}

import React, { useEffect, useRef, useState } from 'react';
import { useWorkforceAccess } from '../context/WorkforceAccessContext';
import { hasPermission } from '../lib/access';
import { technicalSheets, type ServiceSheet } from '../services/technical-sheet.service';
import TechnicalSheetForm from './TechnicalSheetForm';
import SheetAssignmentEditor from './SheetAssignmentEditor';
import TaskCreationForm from './TaskCreationForm';

export default function ServiceTechnicalSheet({ serviceId, sector }: { serviceId: string; sector: string }) {
  const { context } = useWorkforceAccess();
  const [sheet, setSheet] = useState<ServiceSheet | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [checklistBusy, setChecklistBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const mutation = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const request = ++generation.current;
    setSheet(null); setValues({}); setError(''); setLoading(true);
    technicalSheets.load(serviceId, sector).then(result => {
      if (request !== generation.current) return;
      setSheet(result); setValues(result.dados);
    }).catch(cause => {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a ficha.');
    }).finally(() => { if (request === generation.current) setLoading(false); });
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
      {(['iniciar','pausar','concluir'] as const).filter(action=>hasPermission(context,'ordens',action) &&
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
    <TechnicalSheetForm key={`${serviceId}:${sector}:${reload}`} fields={sheet.modelo.campos} value={values} allowedPrivacy={sheet.privacidade_autorizada}
      disabled={sheet.status==='concluida' || saving || checklistBusy || !hasPermission(context, 'ordens', 'editar')} onChange={setValues} onSave={async data => {
        if (mutation.current) throw new Error('Aguarde o salvamento em andamento.');
        mutation.current = true; setSaving(true);
        const request = generation.current;
        try {
          const version = await technicalSheets.save(serviceId, sector, data, sheet.versao);
          if (request !== generation.current) return;
          setSheet(current => current ? { ...current, dados: { ...current.dados, ...data }, versao: version } : current);
        } finally { mutation.current = false; setSaving(false); }
      }} />
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4" disabled={sheet.status==='concluida' || saving || checklistBusy || !hasPermission(context, 'ordens', 'editar')}>
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
    {sheet.status!=='concluida' && <TaskCreationForm serviceId={serviceId} sector={sector}/>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}

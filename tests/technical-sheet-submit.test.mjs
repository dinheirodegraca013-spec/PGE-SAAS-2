import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import React from 'react';
const {code} = await transform(await readFile(new URL('../src/modules/workforce/components/ServiceTechnicalSheet.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'cjs'});
function setup({dirty=false,blocked=false}={}) {
  const sheet = {versao:3,pode_editar:true,acoes_execucao:['iniciar','pausar','concluir'],status:blocked?'pendente':'em_andamento',inicio_liberado:!blocked,bloqueio_fluxo:blocked?'etapa_anterior':null,modelo:{titulo:'Corte',campos:[],checklist:[{key:'medidas',label:'Medidas conferidas'}]},dados:{maquina:'Serra'},privacidade_autorizada:[],checklist:{}};
  const states = [sheet,dirty?{maquina:'Alteração não salva'}:sheet.dados,false,'',0,false,false];
  let index = 0;
  const changes = []; const calls = [];
  let release;
  const pending = new Promise(resolve => {release=resolve;});
  const react = {...React,useState(initial){const key=index++;return [key<states.length?states[key]:initial,next=>changes.push([key,next])];},useRef(initial){return {current:initial};},useEffect(){}};
  function Form() {return null;}
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{
    if(name==='react') return {__esModule:true,default:react,...react};
    if(name.includes('WorkforceAccessContext'))return {useWorkforceAccess:()=>({context:{funcionario:{versao:1}}})};
    if(name==='../lib/access')return {hasPermission:()=>true};
    if(name==='./TechnicalSheetForm')return {__esModule:true,default:Form};
    if(name==='./SheetAssignmentEditor')return {__esModule:true,default:()=>null};
    if(name==='./TaskCreationForm')return {__esModule:true,default:()=>null};
    if(name==='./SheetAttachments')return {__esModule:true,default:()=>null};
    if(name==='./SheetIncidents')return {__esModule:true,default:()=>null};
    if(name==='./InstallationAcceptanceForm')return {__esModule:true,default:()=>null};
    if(name==='./FinishingDryingControl')return {__esModule:true,default:()=>null};
    if(name==='./ProductionLog')return {__esModule:true,default:()=>null};
    if(name==='./MaterialRequestPanel')return {__esModule:true,default:()=>null};
    if(name.includes('installation.service'))return {installation:{}};
    if(name.includes('technical-sheet.service'))return {technicalSheets:{save:async(...args)=>{calls.push(['save',...args]);await pending;return 4;},checklist:async(...args)=>{calls.push(['checklist',...args]);await pending;return {versao:4,checklist:{medidas:true}};}}};
    throw new Error(name);
  },module,module.exports);
  const tree=module.exports.default({serviceId:'service-a',sector:'corte'});
  function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const result=find(child,predicate);if(result)return result;}return null;}
  return {calls,changes,release,form:find(tree,n=>n.type===Form),checkbox:find(tree,n=>n.type==='input'),finish:find(tree,n=>n.type==='button'&&n.props.children==='Concluir'),start:find(tree,n=>n.type==='button'&&n.props.children==='Iniciar')};
}
test('salvar ficha bloqueia checklist e segundo envio antes da próxima renderização',async()=>{
  const s=setup(); const first=s.form.props.onSave({maquina:'Serra 2'});
  await s.checkbox.props.onChange({target:{checked:true}});
  await assert.rejects(s.form.props.onSave({maquina:'Serra 3'}),/Aguarde/);
  assert.equal(s.calls.length,1);assert.equal(s.calls[0][4],3);
  s.release();await first;
  assert.ok(s.changes.some(([key,value])=>key===6&&value===false));
});
test('salvar checklist bloqueia envio da ficha até a confirmação do servidor',async()=>{
  const s=setup();const first=s.checkbox.props.onChange({target:{checked:true}});
  await assert.rejects(s.form.props.onSave({maquina:'Serra 2'}),/Aguarde/);
  assert.equal(s.calls.length,1);assert.equal(s.calls[0][0],'checklist');
  s.release();await first;
  assert.ok(s.changes.some(([key,value])=>key===5&&value===false));
});
test('não conclui execução usando dados antigos quando existem alterações não salvas',async()=>{
  const s=setup({dirty:true});await s.finish.props.onClick();
  assert.equal(s.calls.length,0);
  assert.ok(s.changes.some(([key,value])=>key===3&&value.includes('Salve ou descarte')));
});
test('etapa dependente mantém início desabilitado e não envia requisição',async()=>{
  const s=setup({blocked:true});assert.equal(s.start.props.disabled,true);
  await s.start.props.onClick();assert.equal(s.calls.length,0);
});

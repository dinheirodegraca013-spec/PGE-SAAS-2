import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React from 'react';
const {code}=await transform(await readFile(new URL('../src/modules/workforce/components/MyTasks.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'cjs'});
function setup({failure=false,allowed=true,progress=45}={}){
  const states=['aguardando_material',progress,'Material solicitado',false,''];let index=0;
  const calls=[];const changes=[];let saved=0;
  const react={...React,useId:()=> 'task',useRef:initial=>({current:initial}),useState(initial){const key=index++;return [key<states.length?states[key]:initial,value=>changes.push([key,value])];}};
  const labels={pendente:'Pendente',em_andamento:'Em andamento',pausada:'Pausada',aguardando_material:'Aguardando material',aguardando_aprovacao:'Aguardando aprovação',concluida:'Concluída',cancelada:'Cancelada'};
  const module={exports:{}};
  new Function('require','module','exports',code+'\nmodule.exports.Card=TaskCard;')(name=>{
    if(name==='react')return {__esModule:true,default:react,...react};
    if(name==='@/lib/setores')return {isSetor:s=>s==='corte',setores:{corte:'Corte'}};
    if(name.includes('WorkforceAccessContext'))return {useWorkforceAccess:()=>({context:{}})};
    if(name==='../lib/access')return {hasPermission:()=>allowed};
    if(name.includes('tasks.service'))return {taskStatusLabels:labels,workTasks:{update:async(...args)=>{calls.push(args);if(failure)throw new Error('Versão alterada');return {};}}};
    throw new Error(name);
  },module,module.exports);
  const task={id:'task-a',status:'em_andamento',setor:'corte',titulo:'Conferência',descricao:'Conferir medidas',prioridade:'normal',prazo:null,progresso:20,observacoes:'',versao:3,obrigatoria:true};
  const tree=module.exports.Card({task,onSaved:()=>saved++});
  function find(node){if(!node||typeof node!=='object')return null;if(node.type==='form')return node;for(const child of React.Children.toArray(node.props?.children)){const result=find(child);if(result)return result;}return null;}
  return {calls,changes,task,saved:()=>saved,submit:()=>find(tree).props.onSubmit({preventDefault(){}})};
}
test('atualiza tarefa com versão, progresso e motivo de impedimento',async()=>{
  const s=setup();await s.submit();assert.deepEqual(s.calls,[[s.task,'aguardando_material',45,'Material solicitado']]);assert.equal(s.saved(),1);
});
test('falha preserva formulário e não anuncia atualização concluída',async()=>{
  const s=setup({failure:true});await s.submit();assert.equal(s.saved(),0);
  assert.ok(s.changes.some(([key,value])=>key===4&&value==='Versão alterada'));
  assert.ok(s.changes.some(([key,value])=>key===3&&value===false));
});
test('sem permissão ou progresso inválido não envia atualização',async()=>{
  const denied=setup({allowed:false});await denied.submit();assert.equal(denied.calls.length,0);
  const invalid=setup({progress:101});await invalid.submit();assert.equal(invalid.calls.length,0);
});

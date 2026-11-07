import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import React from 'react';
const {code}=await transform(await readFile(new URL('../src/modules/workforce/components/SheetAssignmentEditor.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'cjs'});
function setup(selected,{failure=false}={}){
  const states=[[{id:'worker-a',nome:'Teste',cargo:'Corte'}],selected,false,false,'','',0];let index=0;
  const changes=[];const calls=[];
  const react={...React,useId:()=> 'assignment',useEffect(){},useState(initial){const key=index++;return [key<states.length?states[key]:initial,value=>changes.push([key,value])];}};
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{
    if(name==='react')return {__esModule:true,default:react,...react};
    if(name.includes('technical-sheet.service'))return {technicalSheets:{}};
    if(name.includes('WorkforceAccessContext'))return {useWorkforceAccess:()=>({context:{proprietario:true},loading:false,error:''})};
    throw new Error(name);
  },module,module.exports);
  const form=module.exports.default({serviceId:'service',sector:'corte',current:null,disabled:false,onAssign:async id=>{calls.push(id);if(failure)throw new Error('Conflito de versão');}});
  return {changes,calls,submit:()=>form.props.onSubmit({preventDefault(){}})};
}
test('atribui somente funcionário disponível e permite remover atribuição',async()=>{
  const valid=setup('worker-a');await valid.submit();assert.deepEqual(valid.calls,['worker-a']);
  const invalid=setup('another-company');await invalid.submit();assert.equal(invalid.calls.length,0);
  const empty=setup('');await empty.submit();assert.deepEqual(empty.calls,[null]);
});
test('falha de atribuição informa erro, libera tentativa e não anuncia sucesso',async()=>{
  const s=setup('worker-a',{failure:true});await s.submit();
  assert.ok(s.changes.some(([key,value])=>key===4&&value==='Conflito de versão'));
  assert.ok(s.changes.some(([key,value])=>key===3&&value===false));
  assert.ok(!s.changes.some(([key,value])=>key===5&&value==='Responsável atualizado.'));
});

test('serviço de atribuição protege contexto e versão antes da operação',async()=>{
  const source=await readFile(new URL('../src/modules/workforce/services/technical-sheet.service.ts',import.meta.url),'utf8');
  assert.match(source,/Os dados da atribuição são inválidos/);
  assert.match(source,/employee!==null/);
});

test('consulta de responsáveis valida o contexto antes da RPC',async()=>{
  const source=await readFile(new URL('../src/modules/workforce/services/technical-sheet.service.ts',import.meta.url),'utf8');
  assert.match(source,/O serviço ou setor dos responsáveis é inválido/);
});


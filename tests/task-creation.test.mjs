import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React from 'react';
const {code}=await transform(await readFile(new URL('../src/modules/workforce/components/TaskCreationForm.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'cjs'});
function setup({employee='worker-a',failure=false,allowed=true}={}){
  const states=['Conferir medidas','Conferir as peças',employee,'','alta',true,[{id:'worker-a',nome:'Operador'}],false,false,'','',0];
  let index=0;let attempts=0;const changes=[];const calls=[];
  const react={...React,useId:()=> 'create-task',useEffect(){},useRef:initial=>({current:initial}),useState(initial){const key=index++;return [key<states.length?states[key]:initial,value=>changes.push([key,value])];}};
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{
    if(name==='react')return {__esModule:true,default:react,...react};
    if(name.includes('WorkforceAccessContext'))return {useWorkforceAccess:()=>({context:{proprietario:true,funcionario:{id:'owner',versao:1}}})};
    if(name==='../lib/access')return {hasPermission:()=>allowed};
    if(name.includes('technical-sheet.service'))return {technicalSheets:{}};
    if(name.includes('tasks.service'))return {workTasks:{create:async input=>{calls.push(input);attempts++;if(failure&&attempts===1)throw new Error('Falha de rede');return {id:input.request,versao:1};}}};
    throw new Error(name);
  },module,module.exports);
  const form=module.exports.default({serviceId:'service-a',sector:'corte'});
  return {calls,changes,form,submit:()=>form.props.onSubmit({preventDefault(){}})};
}
test('criação envia setor, serviço, responsável e obrigatoriedade corretos',async()=>{
  const s=setup();await s.submit();const input=s.calls[0];
  assert.equal(input.sector,'corte');assert.equal(input.service,'service-a');assert.equal(input.employee,'worker-a');assert.equal(input.mandatory,true);
  assert.equal(input.priority,'alta');assert.equal(input.deadline,null);assert.match(input.request,/^[0-9a-f-]{36}$/);
});
test('falha preserva campos e reenvio usa o mesmo identificador',async()=>{
  const s=setup({failure:true});await s.submit();
  assert.ok(s.changes.some(([key,value])=>key===9&&value==='Falha de rede'));
  assert.ok(!s.changes.some(([key])=>key===0||key===1));
  await s.submit();assert.equal(s.calls.length,2);assert.equal(s.calls[0].request,s.calls[1].request);
  assert.ok(s.changes.some(([key,value])=>key===0&&value===''));
});
test('responsável fora da lista ou falta de permissão não cria tarefa',async()=>{
  const invalid=setup({employee:'another-company'});await invalid.submit();assert.equal(invalid.calls.length,0);
  const denied=setup({allowed:false});assert.equal(denied.form,null);
});

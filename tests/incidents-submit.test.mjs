import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React from 'react';
const {code}=await transform(await readFile(new URL('../src/modules/workforce/components/SheetIncidents.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'cjs'});
function setup({resolution=false,failure=false,invalid=false}={}){
  const states=resolution?[invalid?'Curto':'Equipamento reparado e testado.',false,'']:[[],0,false,0,false,'',invalid?'X':'Falha na serra','Equipamento parou durante o corte.','equipamento','critica',false,''];
  let index=0;let attempts=0;let saved=0;const calls=[];const changes=[];
  const react={...React,useId:()=> 'incident',useEffect(){},useRef:initial=>({current:initial}),useState(initial){const key=index++;return [key<states.length?states[key]:initial,value=>changes.push([key,value])];}};
  const module={exports:{}};
  new Function('require','module','exports','window',code+'\nmodule.exports.Resolution=Resolution;')(name=>{
    if(name==='react')return {__esModule:true,default:react,...react};
    if(name.includes('WorkforceAccessContext'))return {useWorkforceAccess:()=>({context:{funcionario:{id:'worker',versao:1}}})};
    if(name==='../lib/access')return {hasPermission:()=>true};
    if(name.includes('incidents.service'))return {incidents:{create:async input=>{calls.push(['create',input]);attempts++;if(failure&&attempts===1)throw new Error('Falha de rede');},resolve:async(...args)=>{calls.push(['resolve',...args]);if(failure)throw new Error('Versão alterada');}}};
    throw new Error(name);
  },module,module.exports,{confirm:()=>true});
  const incident={id:'incident-a',versao:4};
  const tree=resolution?module.exports.Resolution({incident,onSaved:()=>saved++}):module.exports.default({serviceId:'service-a',sector:'corte',canCreate:true});
  function find(node){if(!node||typeof node!=='object')return null;if(node.type==='form')return node;for(const child of React.Children.toArray(node.props?.children)){const result=find(child);if(result)return result;}return null;}
  return {calls,changes,incident,saved:()=>saved,submit:()=>find(tree).props.onSubmit({preventDefault(){}})};
}
test('ocorrência preserva dados após falha e reutiliza o identificador no reenvio',async()=>{
  const s=setup({failure:true});await s.submit();assert.ok(!s.changes.some(([key,value])=>[6,7].includes(key)&&value===''));
  await s.submit();assert.equal(s.calls.length,2);assert.equal(s.calls[0][1].request,s.calls[1][1].request);
  assert.equal(s.calls[0][1].service,'service-a');assert.equal(s.calls[0][1].severity,'critica');
  assert.ok(s.changes.some(([key,value])=>key===6&&value===''));
});
test('resolução envia o registro com versão e só confirma depois do servidor',async()=>{
  const s=setup({resolution:true});await s.submit();assert.deepEqual(s.calls[0],['resolve',s.incident,'Equipamento reparado e testado.']);assert.equal(s.saved(),1);
  const failed=setup({resolution:true,failure:true});await failed.submit();assert.equal(failed.saved(),0);assert.ok(failed.changes.some(([key,value])=>key===2&&value==='Versão alterada'));
});
test('dados incompletos não enviam criação nem resolução',async()=>{
  const create=setup({invalid:true});await create.submit();assert.equal(create.calls.length,0);
  const resolve=setup({resolution:true,invalid:true});await resolve.submit();assert.equal(resolve.calls.length,0);
});

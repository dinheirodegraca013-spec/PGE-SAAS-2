import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React from 'react';
const {code}=await transform(await readFile(new URL('../src/modules/workforce/components/ProductionLog.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'cjs'});

function setup({quantity='1',failure=false}={}){
  const states=['produzido',quantity,'un','',false,''];let index=0;let attempts=0;const calls=[];const changes=[];
  const react={...React,useId:()=> 'production',useRef:initial=>({current:initial}),useState(initial){const key=index++;return [key<states.length?states[key]:initial,value=>changes.push([key,value])];}};
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{if(name==='react')return {__esModule:true,default:react,...react};throw new Error(name);},module,module.exports);
  const tree=module.exports.default({state:{versao:2,totais:{produzido:0,defeito:0,desperdicio:0},registros:[]},canRegister:true,disabled:false,onRefresh(){},onRegister:async input=>{calls.push(input);attempts++;if(failure&&attempts===1)throw new Error('Falha de rede');}});
  return {calls,changes,submit:()=>tree.props.children.find(child=>child?.type==='form')?.props.onSubmit({preventDefault(){}})};
}

test('registro de produção rejeita quantidade inválida antes do servidor',async()=>{
  for(const quantity of ['0','-1','NaN']){const s=setup({quantity});await s.submit();assert.equal(s.calls.length,0);}
});

test('registro preserva o mesmo identificador após falha transitória',async()=>{
  const s=setup({failure:true});await s.submit();await s.submit();
  assert.equal(s.calls.length,2);assert.equal(s.calls[0].request,s.calls[1].request);assert.equal(s.calls[0].type,'produzido');assert.equal(s.calls[0].quantity,1);assert.equal(s.calls[0].unit,'un');
});

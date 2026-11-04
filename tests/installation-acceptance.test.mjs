import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React from 'react';
const {code}=await transform(await readFile(new URL('../src/modules/workforce/components/InstallationAcceptanceForm.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'cjs'});
function setup({confirmed=true,proof='proof-a',failure=false,disabled=false}={}){
  const states=['Cliente Teste',proof,'Entrega conferida',confirmed,false,''];let index=0;let attempts=0;const calls=[];const changes=[];
  const react={...React,useId:()=> 'acceptance',useRef:initial=>({current:initial}),useState(initial){const key=index++;return [key<states.length?states[key]:initial,value=>changes.push([key,value])];}};
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{if(name==='react')return {__esModule:true,default:react,...react};throw new Error(name);},module,module.exports);
  const form=module.exports.default({attachments:[{id:'proof-a',nome:'Comprovante validado.pdf'}],disabled,onRegister:async input=>{calls.push(input);attempts++;if(failure&&attempts===1)throw new Error('Falha de rede');}});
  return {calls,changes,submit:()=>form.props.onSubmit({preventDefault(){}})};
}
test('aceite exige confirmação e comprovante da lista autorizada',async()=>{
  for(const scenario of [{confirmed:false},{proof:'other-service-proof'},{proof:''},{disabled:true}]){
    const s=setup(scenario);await s.submit();assert.equal(s.calls.length,0);
  }
});
test('registro envia dados confirmados e reutiliza requisição após falha',async()=>{
  const s=setup({failure:true});await s.submit();
  assert.ok(s.changes.some(([key,value])=>key===5&&value==='Falha de rede'));
  assert.ok(!s.changes.some(([key])=>key<=3));
  await s.submit();assert.equal(s.calls.length,2);assert.equal(s.calls[0].request,s.calls[1].request);
  assert.equal(s.calls[1].confirmed,true);assert.equal(s.calls[1].proof,'proof-a');assert.equal(s.calls[1].clientName,'Cliente Teste');
});

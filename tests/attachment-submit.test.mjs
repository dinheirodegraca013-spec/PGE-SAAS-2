import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React from 'react';
const {code}=await transform(await readFile(new URL('../src/modules/workforce/components/SheetAttachments.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'cjs'});
function setup({canUpload=true,invalid=false,failure=false}={}){
  const file=new File(['test'],invalid?'script.html':'plano.pdf',{type:invalid?'text/html':'application/pdf'});
  const states=[[],false,0,0,file,false,false,'','',{}];let index=0;let attempts=0;const calls=[];const changes=[];
  const react={...React,useId:()=> 'attachment',useEffect(){},useRef:initial=>({current:initial}),useState(initial){const key=index++;return [key<states.length?states[key]:initial,value=>changes.push([key,value])];}};
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{
    if(name==='react')return {__esModule:true,default:react,...react};
    if(name.includes('WorkforceAccessContext'))return {useWorkforceAccess:()=>({context:{funcionario:{id:'worker',versao:1}}})};
    if(name.includes('../lib/access'))return {hasPermission:()=>true};
    if(name.includes('attachments.service'))return {attachments:{prepare:async(...args)=>{calls.push(['prepare',...args]);return {id:'attachment-a',caminho:'company/file',bucket:'workforce-private'};},upload:async(...args)=>{calls.push(['upload',...args]);attempts++;if(failure&&attempts===1)throw new Error('Validação indisponível');}}};
    throw new Error(name);
  },module,module.exports);
  const tree=module.exports.default({serviceId:'service-a',sector:'corte',canUpload});
  function find(node){if(!node||typeof node!=='object')return null;if(node.type==='form')return node;for(const child of React.Children.toArray(node.props?.children)){const result=find(child);if(result)return result;}return null;}
  const form=find(tree);return {calls,changes,form,submit:()=>form.props.onSubmit({preventDefault(){}})};
}
test('upload mantém o mesmo preparo após falha e só limpa arquivo após validação',async()=>{
  const s=setup({failure:true});await s.submit();
  assert.ok(s.changes.some(([key,value])=>key===7&&value==='Validação indisponível'));
  assert.ok(!s.changes.some(([key,value])=>key===4&&value===null));
  await s.submit();assert.equal(s.calls.filter(call=>call[0]==='prepare').length,1);assert.equal(s.calls.filter(call=>call[0]==='upload').length,2);
  assert.ok(s.changes.some(([key,value])=>key===4&&value===null));
});
test('formulário recusa tipo inválido antes de preparar envio e respeita leitura somente',async()=>{
  const invalid=setup({invalid:true});await invalid.submit();assert.equal(invalid.calls.length,0);
  const readonly=setup({canUpload:false});assert.equal(readonly.form,null);
});


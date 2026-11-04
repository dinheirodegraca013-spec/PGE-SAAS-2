import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React from 'react';
const {code}=await transform(await readFile(new URL('../src/modules/workforce/components/WorkNotifications.tsx',import.meta.url),'utf8'),{loader:'tsx',format:'cjs'});
function setup({failure=false}={}){
  const data={itens:[{id:'notification-a',servico_id:'service-a',setor:'corte',evento:'ficha_atribuida',criada_em:'2026-11-04T00:00:00Z',lida_em:null}],nao_lidas:1,tem_mais:false};
  const states=[data,0,0,false,'',null,null];let index=0;
  const calls=[];const changes=[];let release;const pending=new Promise(resolve=>{release=resolve;});
  const react={...React,useEffect(){},useRef(initial){return {current:initial};},useState(initial){const key=index++;return [key<states.length?states[key]:initial,value=>changes.push([key,value])];}};
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{
    if(name==='react')return {__esModule:true,default:react,...react};
    if(name==='@/lib/setores')return {isSetor:s=>s==='corte',setores:{corte:'Corte'}};
    if(name.includes('WorkforceAccessContext'))return {useWorkforceAccess:()=>({context:{funcionario:{id:'worker',versao:1}}})};
    if(name.includes('notifications.service'))return {workNotifications:{read:async id=>{calls.push(id);await pending;if(failure)throw new Error('Acesso revogado');return {id,lida_em:'2026-11-04T01:00:00Z'};}}};
    if(name==='./ServiceTechnicalSheet')return {__esModule:true,default:()=>null};
    if(name==='./TaskDetails')return {__esModule:true,default:()=>null};
    throw new Error(name);
  },module,module.exports);
  const tree=module.exports.default();
  function find(node){if(!node||typeof node!=='object')return null;if(node.type==='button'&&node.props.children==='Marcar como lida')return node;for(const child of React.Children.toArray(node.props?.children)){const result=find(child);if(result)return result;}return null;}
  return {calls,changes,release,data,click:()=>find(tree).props.onClick()};
}
test('leitura usa identificador correto e cliques simultâneos enviam uma única requisição',async()=>{
  const s=setup();const first=s.click();await s.click();assert.deepEqual(s.calls,['notification-a']);s.release();await first;
  const update=s.changes.find(([key,value])=>key===0&&typeof value==='function')[1];
  const next=update(s.data);assert.equal(next.nao_lidas,0);assert.ok(next.itens[0].lida_em);
});
test('falha de leitura mantém contador e informa o erro sem simular sucesso',async()=>{
  const s=setup({failure:true});const first=s.click();s.release();await first;
  assert.ok(s.changes.some(([key,value])=>key===4&&value==='Acesso revogado'));
  assert.ok(!s.changes.some(([key])=>key===0));
  assert.ok(s.changes.some(([key,value])=>key===5&&value===null));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import React from 'react';

const { code } = await transform(await readFile(new URL('../src/views/visao3d/Visao3DView.tsx', import.meta.url),'utf8'), { loader:'tsx', format:'cjs', jsx:'transform' });
async function setup(financeiro) {
  const states=[], effects=[], queries=[];
  let cursor=0, mounted=false;
  const react={...React,useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},useEffect(fn){if(!mounted)effects.push(fn);},useMemo:fn=>fn(),useCallback:fn=>fn};
  const Map=()=>null;
  const supabase={from(table){
    const query={table,filters:[],select(columns,options){this.columns=columns;this.options=options;return this;},order(){return this;},eq(...args){this.filters.push(['eq',...args]);return this;},not(...args){this.filters.push(['not',...args]);return this;},lt(...args){this.filters.push(['lt',...args]);return this;},then(resolve,reject){return Promise.resolve(table==='financeiro_lancamentos'?financeiro:{data:[],error:null}).then(resolve,reject);}};
    queries.push(query);return query;
  }};
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{
    if(name==='react')return {__esModule:true,default:react,...react};
    if(name==='lucide-react')return new Proxy({},{get:()=>()=>null});
    if(name==='react-router-dom')return {Link:({children})=>children,useNavigate:()=>()=>{}};
    if(name==='@/lib/supabase')return {supabase};
    if(name==='@/services/api/client')return {getCurrentTenantId:()=> 'tenant-test'};
    if(name.includes('projetos.service'))return {projetosService:{listar:async()=>({succeeded:true,value:{items:[]}})}};
    if(name.includes('types/projeto'))return {StatusProjeto:{Entregue:6,Cancelado:8}};
    if(name==='./ThreeOperationalMap')return {__esModule:true,default:Map};
    throw new Error(name);
  },module,module.exports);
  const render=()=>{cursor=0;const tree=module.exports.default();mounted=true;return tree;};
  render();effects.forEach(fn=>fn());await new Promise(setImmediate);
  const tree=render();
  function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found;}return null;}
  function text(node){if(typeof node==='string'||typeof node==='number')return String(node);return node&&typeof node==='object'?React.Children.toArray(node.props?.children).map(text).join(' '):'';}
  return {sector:find(tree,node=>node.type===Map).props.setores.find(s=>s.id==='financeiro'),text:text(tree),query:queries.find(q=>q.table==='financeiro_lancamentos')};
}
test('contas vencidas reais deixam o setor financeiro crítico',async()=>{
  const s=await setup({count:3,error:null});
  assert.equal(s.sector.estado,'critico');assert.equal(s.sector.detalhe,'3 conta(s) vencida(s)');assert.match(s.text,/Abrir financeiro/);assert.doesNotMatch(s.text,/Tudo certo/);
});
test('contagem confirmada em zero deixa o financeiro normal',async()=>{
  const s=await setup({count:0,error:null});assert.equal(s.sector.estado,'normal');assert.equal(s.sector.detalhe,'Nenhuma conta vencida');
});
test('falha ou ausência da contagem não vira ausência de pendências',async()=>{
  for(const response of [{count:null,error:{message:'Denied'}},{count:null,error:null}]){
    const s=await setup(response);assert.equal(s.sector.estado,'sem-dados');assert.match(s.text,/Financeiro indisponível/);assert.match(s.text,/Consulta parcial/);assert.doesNotMatch(s.text,/Tudo certo/);
  }
});
test('consulta usa empresa atual, exclui contas quitadas e não transfere valores financeiros',async()=>{
  const {query}=await setup({count:0,error:null});
  assert.equal(query.columns,'id');assert.deepEqual(query.options,{count:'exact',head:true});
  assert.ok(query.filters.some(f=>JSON.stringify(f)===JSON.stringify(['eq','tenant_id','tenant-test'])));
  assert.ok(query.filters.some(f=>JSON.stringify(f)===JSON.stringify(['eq','tipo','despesa'])));
  assert.ok(query.filters.some(f=>JSON.stringify(f)===JSON.stringify(['not','status','in','(quitado,cancelado)'])));
  assert.ok(query.filters.some(f=>f[0]==='lt'&&f[1]==='vencimento'&&/^\d{4}-\d{2}-\d{2}$/.test(f[2])));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const {code}=await transform(await readFile(new URL('../src/modules/workforce/services/attachments.service.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'});
function setup({uploadError=false,validationFailures=0}={}){
  const calls=[];let attempts=0;
  const supabase={storage:{from:bucket=>({upload:async(path,file,options)=>{calls.push(['upload',bucket,path,options]);return {error:uploadError?{}:null};},createSignedUrl:async(path,seconds)=>{calls.push(['signed',bucket,path,seconds]);return {data:{signedUrl:'https://storage.example.test/signed'},error:null};}})},functions:{invoke:async(name,args)=>{calls.push(['validate',name,args]);attempts++;return attempts<=validationFailures?{data:null,error:{message:'Sessão expirada'}}:{data:{status:'validado'},error:null};}}};
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{
    if(name==='@/lib/supabase')return {supabase};
    if(name==='@/services/api/function-errors')return {mensagemErroFuncao:async error=>error?.message||'Falha'};
    throw new Error(name);
  },module,module.exports);
  return {calls,api:module.exports.attachments};
}
test('upload nunca sobrescreve arquivo e só termina após confirmação do servidor',async()=>{
  const s=setup();const receipt={id:'attachment',caminho:'company/file',bucket:'workforce-private'};
  await s.api.upload(new File(['test'],'image.png',{type:'image/png'}),receipt);
  assert.deepEqual(s.calls[0],['upload','workforce-private','company/file',{contentType:'image/png',upsert:false}]);
  assert.deepEqual(s.calls[1],['validate','validar-anexo',{body:{anexo_id:'attachment'}}]);assert.equal(receipt.uploaded,true);
});
test('falha na validação permite repetir sem reenviar arquivo já armazenado',async()=>{
  const s=setup({validationFailures:1});const receipt={id:'attachment',caminho:'company/file',bucket:'workforce-private'};const file=new File(['test'],'image.png',{type:'image/png'});
  await assert.rejects(s.api.upload(file,receipt),/Sessão expirada/);await s.api.upload(file,receipt);
  assert.equal(s.calls.filter(call=>call[0]==='upload').length,1);assert.equal(s.calls.filter(call=>call[0]==='validate').length,2);
});
test('resposta perdida do upload é resolvida pela validação e links expiram em 60 segundos',async()=>{
  const s=setup({uploadError:true});await s.api.upload(new File(['test'],'image.png',{type:'image/png'}),{id:'attachment',caminho:'company/file',bucket:'workforce-private'});
  await s.api.link('company/file');assert.deepEqual(s.calls.at(-1),['signed','workforce-private','company/file',60]);
  await assert.rejects(s.api.upload(new File(['x'],'x'),{id:'bad',caminho:'bad',bucket:'public'}),/inválido/);
});

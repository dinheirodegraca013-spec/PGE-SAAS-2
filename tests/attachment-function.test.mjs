import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const shared=await transform(await readFile(new URL('../supabase/functions/_shared/attachment-content.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'});
const sharedModule={exports:{}};new Function('module','exports',shared.code)(sharedModule,sharedModule.exports);
const source=(await readFile(new URL('../supabase/functions/validar-anexo/index.ts',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'');
const {code}=await transform(source,{loader:'ts',format:'cjs',target:'es2022'});
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8lcAAAAASUVORK5CYII=','base64'));
const attachment='12345678-1234-1234-1234-123456789012';
function setup({invalidUser=false,denied=false,mismatchedUser=false,corrupt=false,downloadFailure=false,finalFailure=false}={}){
  let handler;const calls=[];
  const context={id:attachment,usuario_id:mismatchedUser?'other-user':'worker',sessao_id:'trusted-session',objeto_id:'trusted-object',bucket:'workforce-private',caminho:'trusted-company/trusted-file',tipo:'image/png',tamanho:png.length};
  const admin={auth:{getUser:async()=>({data:{user:invalidUser?null:{id:'worker'}},error:invalidUser?{}:null})},storage:{from:bucket=>({download:async path=>{calls.push(['download',bucket,path]);return {data:downloadFailure?null:new Blob([corrupt?new Uint8Array(png.length):png]),error:downloadFailure?{}:null};}})},rpc:async(name,args)=>{calls.push([name,args]);return {data:finalFailure?null:{id:attachment,status:'validado'},error:finalFailure?{}:null};}};
  const caller={rpc:async(name,args)=>{calls.push([name,args]);return {data:denied?null:context,error:denied?{}:null};}};
  new Function('createClient','Deno','attachmentContentError','attachmentDigest',code)(
    (_url,key)=>key==='service'?admin:caller,
    {env:{get:name=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service',SUPABASE_ANON_KEY:'anon'})[name]},serve:value=>{handler=value;}},
    sharedModule.exports.attachmentContentError,sharedModule.exports.attachmentDigest);
  return {calls,run:({token=true,method='POST',body={anexo_id:attachment},raw}={})=>handler(new Request('https://example.test',{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer signed-token'}:{})},...(method==='GET'||method==='OPTIONS'?{}:{body:raw??JSON.stringify(body)})}))};
}
test('exige identidade válida e contexto autorizado antes de baixar arquivos',async()=>{
  for(const [scenario,status] of [[{invalidUser:true},401],[{denied:true},403],[{mismatchedUser:true},403]]){
    const s=setup(scenario);assert.equal((await s.run()).status,status);assert.ok(!s.calls.some(call=>call[0]==='download'));
  }
  const missing=setup();assert.equal((await missing.run({token:false})).status,401);assert.equal(missing.calls.length,0);
});
test('rejeita payload inválido ou grande e respeita método HTTP',async()=>{
  const s=setup();assert.equal((await s.run({method:'OPTIONS'})).status,204);assert.equal((await s.run({method:'GET'})).status,405);
  assert.equal((await s.run({raw:'invalid-json'})).status,400);assert.equal((await s.run({raw:'x'.repeat(1025)})).status,413);
  assert.equal((await s.run({body:{anexo_id:'invalid'}})).status,400);assert.equal(s.calls.length,0);
});
test('valida conteúdo real e confirma somente caminho, usuário e sessão do banco',async()=>{
  const s=setup();const response=await s.run({body:{anexo_id:attachment,caminho:'other-company/secret',usuario_id:'admin',sessao_id:'forged'}});
  assert.equal(response.status,200);assert.deepEqual(s.calls.find(call=>call[0]==='download'),['download','workforce-private','trusted-company/trusted-file']);
  const args=s.calls.find(call=>call[0]==='anexo_confirmar_validacao')[1];
  assert.equal(args.p_usuario,'worker');assert.equal(args.p_sessao,'trusted-session');assert.equal(args.p_objeto,'trusted-object');assert.match(args.p_sha256,/^[a-f0-9]{64}$/);
});
test('conteúdo inválido e falhas de armazenamento não liberam o arquivo',async()=>{
  for(const [scenario,status] of [[{corrupt:true},422],[{downloadFailure:true},502]]){
    const s=setup(scenario);assert.equal((await s.run()).status,status);assert.ok(!s.calls.some(call=>call[0]==='anexo_confirmar_validacao'));
  }
  const revoked=setup({finalFailure:true});assert.equal((await revoked.run()).status,409);
});

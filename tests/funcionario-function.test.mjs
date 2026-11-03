import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const source = (await readFile(new URL('../supabase/functions/cadastrar-funcionario/index.ts',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');
const { code } = await transform(source,{loader:'ts',target:'es2022',format:'cjs'});
function setup({ role='AdministradorTenant',active=true,mailFailure=false }={}) {
  let handler;
  const calls=[];
  const profile={tenant_id:'trusted-company',papel:role,ativo:active,setor:null,tenants:{ativo:true}};
  const admin={
    from:()=>({select:()=>({eq:()=>({single:async()=>({data:profile,error:null})})})}),
    auth:{getUser:async()=>({data:{user:{id:'trusted-admin'}}}),
      admin:{createUser:async body=>{calls.push(['create',body]);return {data:{user:{id:'employee'}}};},deleteUser:async id=>{calls.push(['delete',id]);return {}; }},
      resetPasswordForEmail:async(email,options)=>{calls.push(['mail',email,options]);return {error:mailFailure?new Error('mail failed'):null};}},
  };
  new Function('createClient','Deno','crypto','Response',code)(()=>admin,{env:{get:()=>undefined},serve:h=>handler=h},globalThis.crypto,Response);
  return {calls,run:(body,token=true)=>handler(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer valid'}:{})},body:JSON.stringify(body)}))};
}
const body={nome:'Pessoa Teste',email:'pessoa@example.test',setor:'corte',tenant_id:'attacker-company',papel:'AdministradorTenant'};
test('cadastro exige token e administrador ativo',async()=>{
  for(const scenario of [{role:'Instalador'},{active:false}]){const s=setup(scenario);assert.equal((await s.run(body)).status,403);assert.equal(s.calls.length,0);}
  const s=setup();assert.equal((await s.run(body,false)).status,401);assert.equal(s.calls.length,0);
});
test('cadastro ignora empresa e papel enviados pelo navegador',async()=>{
  const s=setup();const response=await s.run(body);assert.equal(response.status,201);
  const created=s.calls[0][1];assert.equal(created.app_metadata.gestio_tenant_id,'trusted-company');assert.equal(created.app_metadata.gestio_criado_por,'trusted-admin');assert.equal(created.app_metadata.gestio_setor,'corte');assert.ok(created.password.length>=64);
  assert.deepEqual(await response.json(),{success:true});assert.equal(s.calls[1][2].redirectTo,'https://gestio.dev.br/redefinir-senha');
});
test('setor inválido é recusado antes da criação',async()=>{const s=setup();assert.equal((await s.run({...body,setor:'admin'})).status,400);assert.equal(s.calls.length,0);});
test('falha de e-mail desfaz somente a conta recém-criada',async()=>{const s=setup({mailFailure:true});assert.equal((await s.run(body)).status,502);assert.deepEqual(s.calls.at(-1),['delete','employee']);});

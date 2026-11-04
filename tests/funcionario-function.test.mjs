import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const source = (await readFile(new URL('../supabase/functions/cadastrar-funcionario/index.ts',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');
const { code } = await transform(source,{loader:'ts',target:'es2022',format:'cjs'});
function setup({ role='AdministradorTenant',active=true,mailFailure=false,createFailure=null,enforcePasswordLimit=false,slots=2,deviceAllowed=true,loseRace=false }={}) {
  let handler;
  const calls=[];
  const profile={tenant_id:'trusted-company',papel:role,ativo:active,setor:null,tenants:{ativo:true,principal_usuario_id:'trusted-admin'}};
  let quotaCalls=0;
  const admin={
    rpc:async()=>({data:deviceAllowed?{sublogins_available:loseRace&&quotaCalls++>0?0:slots}:null,error:deviceAllowed?null:{message:'Dispositivo não autorizado.'}}),
    from:()=>({select:()=>({eq:()=>({single:async()=>({data:profile,error:null})})})}),
    auth:{getUser:async()=>({data:{user:{id:'trusted-admin'}}}),
      admin:{createUser:async body=>{calls.push(['create',body]);const error=createFailure||(enforcePasswordLimit&&Buffer.byteLength(body.password,'utf8')>72?{code:'validation_failed',status:400}:null);return error?{data:{user:null},error}:{data:{user:{id:'employee'}}};},deleteUser:async id=>{calls.push(['delete',id]);return {}; }},
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
test('limite de sublogins e dispositivo bloqueado impedem criação no servidor',async()=>{
  for(const scenario of [{slots:0},{deviceAllowed:false}]) {
    const s=setup(scenario);assert.equal((await s.run(body)).status,scenario.deviceAllowed===false?403:409);
    assert.equal(s.calls.length,0);
  }
});
test('concorrente que perde a última vaga recebe mensagem de limite sem enviar e-mail',async()=>{
  const s=setup({loseRace:true,createFailure:{code:'unexpected_failure',status:500}});
  const response=await s.run(body);assert.equal(response.status,409);
  assert.match((await response.json()).error,/Limite de sublogins/);
  assert.equal(s.calls.some(call=>call[0]==='mail'),false);
});
test('cadastro ignora empresa e papel enviados pelo navegador',async()=>{
  const s=setup();const response=await s.run(body);assert.equal(response.status,201);
  const created=s.calls[0][1];assert.equal(created.app_metadata.gestio_tenant_id,'trusted-company');assert.equal(created.app_metadata.gestio_criado_por,'trusted-admin');assert.equal(created.app_metadata.gestio_setor,'corte');assert.ok(created.password.length>=64);
  assert.deepEqual(await response.json(),{success:true});assert.equal(s.calls[1][2].redirectTo,'https://gestio.dev.br/redefinir-senha');
});
test('setor inválido é recusado antes da criação',async()=>{const s=setup();assert.equal((await s.run({...body,setor:'admin'})).status,400);assert.equal(s.calls.length,0);});
test('cadastro preserva cargo e identificador interno em metadados confiáveis',async()=>{const s=setup();assert.equal((await s.run({...body,cargo:'Montador',identificador_interno:'FUNC-007'})).status,201);const created=s.calls[0][1];assert.equal(created.app_metadata.gestio_cargo,'Montador');assert.equal(created.app_metadata.gestio_identificador_interno,'FUNC-007');});
test('falha de e-mail desfaz somente a conta recém-criada',async()=>{const s=setup({mailFailure:true});assert.equal((await s.run(body)).status,502);assert.deepEqual(s.calls.at(-1),['delete','employee']);});
test('senha temporária respeita o limite real do Supabase e contém todas as classes',async()=>{
  const s=setup({enforcePasswordLimit:true});assert.equal((await s.run(body)).status,201);
  const password=s.calls[0][1].password;
  assert.ok(Buffer.byteLength(password,'utf8')<=72);assert.ok(password.length>=64);
  for(const pattern of [/[A-Z]/,/[a-z]/,/\d/,/[^A-Za-z0-9]/])assert.match(password,pattern);
});
test('só conflito confirmado é apresentado como e-mail já cadastrado',async()=>{
  const duplicate=setup({createFailure:{code:'email_exists',status:422}});const conflict=await duplicate.run(body);
  assert.equal(conflict.status,409);assert.match((await conflict.json()).error,/já.*cadastrado/);
  const failed=setup({createFailure:{code:'validation_failed',status:400}});const response=await failed.run(body);
  assert.equal(response.status,502);assert.doesNotMatch((await response.json()).error,/já.*cadastrado/);
  assert.equal(failed.calls.some(call=>call[0]==='mail'),false);
});


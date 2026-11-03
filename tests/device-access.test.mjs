import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const { code } = await transform(await readFile(new URL('../src/services/api/device-access.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'});
function setup(failure=false) {
  const storage=new Map(); const calls=[]; let seq=0;
  const module={exports:{}};
  new Function('require','module','exports','localStorage','crypto','navigator',code)(()=>({supabase:{rpc:async(name,args)=>{calls.push({name,args});return {data:failure?null:{authorized:true},error:failure?{message:'Limite de dispositivos atingido.'}:null};}}}),module,module.exports,
    {getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},{randomUUID:()=>`device-${++seq}`},{userAgent:'Mozilla/5.0 (iPhone) AppleWebKit Safari/605.1.15'});
  return {api:module.exports,calls};
}
test('identidade do navegador persiste e é enviada ao servidor sem senha ou fingerprint',async()=>{
  const s=setup();await s.api.authorizeDevice();await s.api.authorizeDevice();
  assert.equal(s.calls[0].args.p_chave,s.calls[1].args.p_chave);
  assert.equal(s.calls[0].name,'autorizar_dispositivo');
  assert.deepEqual(Object.keys(s.calls[0].args).sort(),['p_chave','p_nome']);
  assert.equal(s.calls[0].args.p_nome,'Safari · iOS');
});
test('dispositivo revogado só recebe nova identidade por ação explícita',async()=>{
  const s=setup();await s.api.authorizeDevice();await s.api.authorizeDevice(true);
  assert.notEqual(s.calls[0].args.p_chave,s.calls[1].args.p_chave);
});
test('recusa do servidor impede autorizar o login e preserva mensagem de limite',async()=>{
  const s=setup(true);await assert.rejects(s.api.authorizeDevice(),/Limite de dispositivos/);
});

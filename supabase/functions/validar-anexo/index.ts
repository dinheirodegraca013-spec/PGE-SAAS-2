import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {attachmentContentError,attachmentDigest} from '../_shared/attachment-content.ts';

const origin=new URL(Deno.env.get('SITE_URL')||'https://gestio.dev.br').origin;
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};
const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply(405,{error:'Método não permitido.'});
  const authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return reply(401,{error:'Faça login novamente.'});
  const url=Deno.env.get('SUPABASE_URL')!;
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const {data:{user},error:authError}=await admin.auth.getUser(authorization.slice(7));
    if(authError || !user)return reply(401,{error:'Sessão inválida.'});
    const reader=request.body?.getReader();if(!reader)return reply(400,{error:'Informe o anexo.'});
    let bodyText='';let bytesRead=0;const decoder=new TextDecoder();
    while(true){const {value,done}=await reader.read();if(done)break;bytesRead+=value.byteLength;if(bytesRead>1024){await reader.cancel();return reply(413,{error:'Requisição acima do limite.'});}bodyText+=decoder.decode(value,{stream:true});}
    bodyText+=decoder.decode();
    let body;try{body=JSON.parse(bodyText);}catch{return reply(400,{error:'Dados inválidos.'});}
    if(typeof body?.anexo_id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.anexo_id))return reply(400,{error:'Identificador de anexo inválido.'});
    const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:context,error:contextError}=await caller.rpc('anexo_contexto_validacao',{p_anexo:body.anexo_id});
    if(contextError || !context || context.usuario_id!==user.id || context.bucket!=='workforce-private')return reply(403,{error:'Anexo indisponível para esta sessão.'});
    const {data:file,error:downloadError}=await admin.storage.from(context.bucket).download(context.caminho);
    if(downloadError || !file)return reply(502,{error:'Não foi possível verificar o arquivo. Tente novamente.'});
    if(file.size>10485760 || file.size!==context.tamanho)return reply(422,{error:'O tamanho do arquivo não corresponde ao envio autorizado.'});
    const bytes=new Uint8Array(await file.arrayBuffer());
    const contentError=attachmentContentError(bytes,context.tipo,context.tamanho);
    if(contentError)return reply(422,{error:contentError});
    const hash=await attachmentDigest(bytes);
    const {data:result,error:finalError}=await admin.rpc('anexo_confirmar_validacao',{p_anexo:context.id,p_usuario:user.id,p_sessao:context.sessao_id,p_objeto:context.objeto_id,p_sha256:hash});
    if(finalError || !result)return reply(409,{error:'Não foi possível liberar o arquivo. Recarregue a ficha e tente novamente.'});
    return reply(200,result);
  }catch{return reply(500,{error:'Não foi possível validar o anexo agora.'});}
});

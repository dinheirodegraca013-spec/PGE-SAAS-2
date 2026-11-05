import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {attachmentContentError,attachmentDigest} from './attachment-content.ts';

const origin=new URL(Deno.env.get('SITE_URL')||'https://gestio.dev.br').origin;
const originUrl=new URL(origin);
const alternateOrigin=originUrl.hostname.startsWith('www.')?`${originUrl.protocol}//${originUrl.hostname.slice(4)}`:`${originUrl.protocol}//www.${originUrl.hostname}`;
const allowedOrigins=new Set([origin,alternateOrigin]);
const headers=(request:Request)=>({'Access-Control-Allow-Origin':allowedOrigins.has(request.headers.get('Origin')||'')?request.headers.get('Origin')||origin:origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store, max-age=0','Vary':'Origin'});
const reply=(request:Request,status:number,body:object)=>new Response(JSON.stringify(body),{status,headers:headers(request)});
Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(request)});
  if(request.method!=='POST')return reply(request,405,{error:'Método não permitido.'});
  const authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return reply(request,401,{error:'Faça login novamente.'});
  const url=Deno.env.get('SUPABASE_URL')!;
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const {data:{user},error:authError}=await admin.auth.getUser(authorization.slice(7));
    if(authError || !user)return reply(request,401,{error:'Sessão inválida.'});
    const reader=request.body?.getReader();if(!reader)return reply(request,400,{error:'Informe o anexo.'});
    let bodyText='';let bytesRead=0;const decoder=new TextDecoder();
    while(true){const {value,done}=await reader.read();if(done)break;bytesRead+=value.byteLength;if(bytesRead>1024){await reader.cancel();return reply(request,413,{error:'Requisição acima do limite.'});}bodyText+=decoder.decode(value,{stream:true});}
    bodyText+=decoder.decode();
    let body;try{body=JSON.parse(bodyText);}catch{return reply(request,400,{error:'Dados inválidos.'});}
    if(typeof body?.anexo_id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.anexo_id))return reply(request,400,{error:'Identificador de anexo inválido.'});
    const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:context,error:contextError}=await caller.rpc('anexo_contexto_validacao',{p_anexo:body.anexo_id});
    if(contextError || !context || context.usuario_id!==user.id || context.bucket!=='workforce-private')return reply(request,403,{error:'Anexo indisponível para esta sessão.'});
    const {data:file,error:downloadError}=await admin.storage.from(context.bucket).download(context.caminho);
    if(downloadError || !file)return reply(request,502,{error:'Não foi possível verificar o arquivo. Tente novamente.'});
    if(file.size>10485760 || file.size!==context.tamanho)return reply(request,422,{error:'O tamanho do arquivo não corresponde ao envio autorizado.'});
    const bytes=new Uint8Array(await file.arrayBuffer());
    const contentError=attachmentContentError(bytes,context.tipo,context.tamanho);
    if(contentError)return reply(request,422,{error:contentError});
    const hash=await attachmentDigest(bytes);
    const {data:result,error:finalError}=await admin.rpc('anexo_confirmar_validacao',{p_anexo:context.id,p_usuario:user.id,p_sessao:context.sessao_id,p_objeto:context.objeto_id,p_sha256:hash});
    if(finalError || !result)return reply(request,409,{error:'Não foi possível liberar o arquivo. Recarregue a ficha e tente novamente.'});
    return reply(request,200,result);
  }catch{return reply(request,500,{error:'Não foi possível validar o anexo agora.'});}
});


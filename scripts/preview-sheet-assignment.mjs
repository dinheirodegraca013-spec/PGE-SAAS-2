// Local UI fixture. No credentials, real employees, or database writes.
import { build } from 'esbuild';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  stdin: { resolveDir: root, loader: 'tsx', contents: `
    import React,{useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import Editor from './src/modules/workforce/components/SheetAssignmentEditor';
    function App(){const[id,setId]=useState(null);return <main>
      <p>Teste local: dados fictícios, sem acesso ao banco.</p>
      <Editor serviceId="fixture" sector="corte" current={id} disabled={false} onAssign={async value=>setId(value)}/>
      <p>Responsável: {id||'nenhum'}</p>
    </main>}
    createRoot(document.getElementById('root')).render(<App/>);
  ` },
  bundle: true, write: false, format: 'iife',
  plugins: [{ name:'fixture', setup(builder) {
    builder.onResolve({filter:/^@\/lib\/supabase$/},()=>({path:'mock',namespace:'fixture'}));
    builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'js',contents:`export const supabase={rpc:async()=>({data:[{id:'fixture-worker',nome:'Funcionário de teste',cargo:'Operador de corte'}],error:null})};`}));
  }}],
});
const server=http.createServer((req,res)=>{
  res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html; charset=utf-8');
  res.end(req.url==='/app.js'?result.outputFiles[0].text:`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body{font:16px Arial;padding:16px;background:#f5f6fa;color:#152238}main{max-width:700px;margin:auto}form{background:white;padding:20px;border:1px solid #dce2ed;border-radius:14px}label{display:block;margin:12px 0}select{width:100%;padding:12px;box-sizing:border-box}button{padding:12px;margin-top:12px;border-radius:8px;border:1px solid #dce2ed;background:white}
    </style><div id="root"></div><script src="/app.js"></script></html>`);
});
server.listen(0,'127.0.0.1',()=>console.log(`http://127.0.0.1:${server.address().port}`));

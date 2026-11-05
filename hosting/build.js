import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});await cp('.openai','dist/.openai',{recursive:true});await cp('drizzle','dist/.openai/drizzle',{recursive:true});
let code='';for(const f of ['public/physics.js','public/rules.js','public/game.js','hosting/api.js'])code+=(await readFile(f,'utf8')).replace(/^import .*?;\s*$/gm,'').replace(/export (function|const|async function)/g,'$1')+'\n';
code+=`export default {async fetch(req,env){const origin=req.headers.get('Origin');const allowed=origin==='https://techbaseml.github.io';if(origin&&!allowed&&origin!==new URL(req.url).origin)return new Response('Origin unavailable',{status:403});
const r=req.method==='OPTIONS'?new Response(null,{status:204}):new URL(req.url).pathname.startsWith('/api/')?await api(req,env.DB):Response.json({service:'ZK POOL rooms'});
if(allowed){r.headers.set('Access-Control-Allow-Origin',origin);r.headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');r.headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');r.headers.set('Vary','Origin')}return r}};`;
await writeFile('dist/server/index.js',code)

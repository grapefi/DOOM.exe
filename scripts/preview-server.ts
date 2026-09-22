import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import worker from '../server/index';
import {localDatabase} from './local-database';
await mkdir('work',{recursive:true});
const {db}=localDatabase('work/leaderboard-preview.sqlite');
const root=resolve('dist/client');
const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.wasm':'application/wasm','.zip':'application/zip'};
createServer(async(req,res)=>{
 try{
  const chunks:Buffer[]=[];for await(const part of req)chunks.push(Buffer.from(part));
  const url='http://127.0.0.1:4175'+req.url;
  const response=await worker.fetch(new Request(url,{method:req.method,headers:req.headers as Record<string,string>,body:['GET','HEAD'].includes(req.method||'GET')?undefined:Buffer.concat(chunks)}),{DB:db,ASSETS:{async fetch(request){
   const pathname=decodeURIComponent(new URL(request.url).pathname),file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(root+sep))return new Response('Not found',{status:404});
   try{return new Response(new Uint8Array(await readFile(file)),{headers:{'Content-Type':mime[extname(file)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}
  }}});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error(error);res.writeHead(500);res.end('Preview error');}
}).listen(4175,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4175'));

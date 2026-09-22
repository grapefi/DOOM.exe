import {database,type Env} from './database';
import {getPrizePool} from './prizePool';
const MAX_ROUND=2*60*60*1000;
type Run={id:string;started_at:number;outcome:string;elapsed_ms:number|null;player_name:string|null;wallet_address:string|null};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function id(value:unknown){return typeof value==='string'&&/^[0-9a-f-]{36}$/.test(value);}
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url),path=url.pathname;
  if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
  if(path==='/api/prize-pool'&&request.method==='GET'){
   try{return json(await getPrizePool());}catch(error){console.error('Prize pool lookup failed',error);return json({error:'Prize pool balance temporarily unavailable. Please try again.'},503);}
  }
  try{
   const db=database(env);
   if(path==='/api/leaderboard'&&request.method==='GET'){
    const dayStart=Math.floor(Date.now()/86400000)*86400000,dayEnd=dayStart+86400000;
    const {results}=await db.prepare("SELECT player_name AS name, elapsed_ms AS elapsedMs, finished_at AS finishedAt FROM runs WHERE outcome = 'complete' AND player_name IS NOT NULL AND finished_at >= ? AND finished_at < ? ORDER BY elapsed_ms ASC, finished_at ASC, id ASC LIMIT 50").bind(dayStart,dayEnd).all();
    return json({entries:results,dayStart,dayEnd});
   }
   if(path==='/api/player-scores'&&request.method==='GET'){
    const query=(url.searchParams.get('q')||'').trim();
    if(query.length<2||query.length>42)return json({error:'Enter a name or a full wallet address.'},400);
    const offset=Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0));
    const match="outcome = 'complete' AND player_name IS NOT NULL AND (player_name = ? COLLATE NOCASE OR wallet_address = ? COLLATE NOCASE)";
    const summary=await db.prepare(`SELECT COUNT(*) AS total, MIN(elapsed_ms) AS bestMs FROM runs WHERE ${match}`).bind(query,query).first();
    const {results}=await db.prepare(`SELECT player_name AS name, elapsed_ms AS elapsedMs, finished_at AS finishedAt FROM runs WHERE ${match} ORDER BY elapsed_ms ASC, finished_at ASC, id ASC LIMIT 50 OFFSET ?`).bind(query,query,Math.floor(offset)).all();
    return json({entries:results,...summary as object});
   }
   if(request.method!=='POST')return json({error:'Not found'},404);
   if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Invalid request origin'},403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
   const raw=await request.text();if(raw.length>2048)return json({error:'Request too large'},413);
   let body:Record<string,unknown>;try{body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw 0;}catch{return json({error:'Invalid request'},400);}
   const now=Date.now();
   if(path==='/api/runs/start'){
    const token=crypto.randomUUID();
    await db.batch([
     db.prepare('DELETE FROM runs WHERE started_at < ? AND player_name IS NULL').bind(now-MAX_ROUND),
     db.prepare('INSERT INTO runs (id, started_at) VALUES (?, ?)').bind(token,now),
    ]);
    return json({id:token},201);
   }
   if(!id(body.id))return json({error:'Invalid round'},400);
   const run=await db.prepare('SELECT * FROM runs WHERE id = ?').bind(body.id).first<Run>();
   if(!run)return json({error:'Round expired. Play again to record a time.'},404);
   if(path==='/api/runs/finish'){
    if(body.outcome!=='complete'&&body.outcome!=='dead')return json({error:'Invalid result'},400);
    if(!Number.isSafeInteger(body.elapsedMs)||(body.elapsedMs as number)<0||(body.elapsedMs as number)>MAX_ROUND)return json({error:'Invalid round time'},400);
    if(run.outcome!=='running'){
     if(run.outcome!==body.outcome||run.elapsed_ms!==body.elapsedMs)return json({error:'Round already ended'},409);
     return json({ok:true});
    }
    // Browser timers can run slightly faster than 35 Hz; tolerate clock drift.
    if(now-run.started_at>MAX_ROUND||(body.elapsedMs as number)>(now-run.started_at)*1.1+1000)return json({error:'Round timing could not be accepted'},400);
    await db.prepare("UPDATE runs SET outcome = ?, elapsed_ms = ?, finished_at = ? WHERE id = ? AND outcome = 'running'").bind(body.outcome,body.elapsedMs,now,body.id).run();
    const ended=await db.prepare('SELECT * FROM runs WHERE id = ?').bind(body.id).first<Run>();
    if(ended?.outcome!==body.outcome||ended?.elapsed_ms!==body.elapsedMs)return json({error:'Round already ended'},409);
    return json({ok:true});
   }
   if(path==='/api/leaderboard'){
    if(run.outcome!=='complete'||!run.elapsed_ms)return json({error:'Only completed rounds can be ranked'},409);
    const name=typeof body.name==='string'?body.name.trim().replace(/\s+/g,' '):'';
    if(!/^[\p{L}\p{N} _.-]{2,20}$/u.test(name))return json({error:'Use 2–20 letters, numbers, spaces, dots, underscores or hyphens.'},400);
    const wallet=typeof body.wallet==='string'?body.wallet.trim().toLowerCase():'';
    if(!/^0x[0-9a-f]{40}$/.test(wallet)||/^0x0{40}$/.test(wallet))return json({error:'Enter a valid non-zero 0x wallet address for your prize payout.'},400);
    if(run.player_name&&(run.player_name!==name||run.wallet_address!==wallet))return json({error:'This round is already on the leaderboard'},409);
    await db.prepare("UPDATE runs SET player_name = ?, wallet_address = ? WHERE id = ? AND outcome = 'complete' AND player_name IS NULL").bind(name,wallet,body.id).run();
    const saved=await db.prepare('SELECT * FROM runs WHERE id = ?').bind(body.id).first<Run>();
    if(saved?.player_name!==name||saved.wallet_address!==wallet)return json({error:'This round is already on the leaderboard'},409);
    return json({ok:true});
   }
   return json({error:'Not found'},404);
  }catch(error){console.error('Leaderboard request failed',path,error);return json({error:'Leaderboard temporarily unavailable. Please try again.'},503);}
 }
};

import assert from 'node:assert/strict';
import worker from '../server/index';
import {localDatabase} from './local-database';
const {db,sqlite}=localDatabase();
const env={DB:db,ASSETS:{fetch:async()=>new Response('asset')}};
async function call(path:string,body?:unknown){const response=await worker.fetch(new Request('https://example.test'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:'https://example.test'},body:body===undefined?undefined:JSON.stringify(body)}),env);return {status:response.status,body:await response.json() as any};}
async function start(){const r=await call('/api/runs/start',{});assert.equal(r.status,201);sqlite.prepare('UPDATE runs SET started_at = started_at - 100000 WHERE id = ?').run(r.body.id);return r.body.id as string;}
const dead=await start();assert.equal((await call('/api/runs/finish',{id:dead,outcome:'dead',elapsedMs:3200})).status,200);
assert.equal((await call('/api/leaderboard',{id:dead,name:'Dead player'})).status,409);
assert.equal((await call('/api/runs/finish',{id:dead,outcome:'complete',elapsedMs:3200})).status,409);
const unfinished=await start();assert.equal((await call('/api/leaderboard',{id:unfinished,name:'Too early'})).status,409);
for(const [name,elapsedMs] of [['Slow',20000],['Fast',7000],['Middle',12000]] as const){
 const id=await start();assert.equal((await call('/api/runs/finish',{id,outcome:'complete',elapsedMs})).status,200);
 assert.equal((await call('/api/runs/finish',{id,outcome:'complete',elapsedMs})).status,200);
 assert.equal((await call('/api/leaderboard',{id,name:'<script>'})).status,400);
 assert.equal((await call('/api/leaderboard',{id,name})).status,200);
 assert.equal((await call('/api/leaderboard',{id,name})).status,200);
}
assert.deepEqual((await call('/api/leaderboard')).body.entries.map((x:any)=>x.name),['Fast','Middle','Slow']);
assert.equal((await call('/api/runs/finish',{id:unfinished,outcome:'complete',elapsedMs:-1})).status,400);
assert.equal((await call('/api/runs/finish',{id:unfinished,outcome:'complete',elapsedMs:500000})).status,400);
assert.equal((await call('/api/runs/finish',{id:crypto.randomUUID(),outcome:'complete',elapsedMs:4000})).status,404);
sqlite.close();console.log('Leaderboard passed: completion-only, death rejection, immutable results, name validation, timing bounds, idempotent save and fastest-first ordering.');

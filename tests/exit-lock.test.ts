import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {bootEngine} from '../shared/engine';
import {enemiesRemaining,updateExitLock} from '../shared/round';
it('blocks the real north-wall exit with living enemies and unlocks it after the last enemy falls',async()=>{
 const d=await bootEngine(readFileSync('game/doom.wasm'),readFileSync('game/trimmed/doomexe.wad')) as Awaited<ReturnType<typeof bootEngine>>&{wasmdoom_apply_player:()=>void;wasmdoom_apply_map_objects:()=>void};
 let exited=false;
 function tick(){d.wasmdoom_tick();const p=d.wasmdoom_events_ptr(),n=d.wasmdoom_events_len(),v=new DataView(d.memory.buffer,p,n);for(let i=0;i+4<=n;){const tag=v.getUint16(i,true),len=v.getUint16(i+2,true);if(tag===102)exited=true;i+=4+len;}d.wasmdoom_events_clear();}
 for(let i=0;i<35;i++)tick();expect(enemiesRemaining(d)).toBe(24);
 d.wasmdoom_snapshot_player();const p=new DataView(d.memory.buffer,d.wasmdoom_player_snapshot_ptr(),164);p.setInt32(0,10000,true);p.setInt32(128,0,true);p.setInt32(132,480*65536,true);p.setUint32(140,0x40000000,true);p.setInt32(144,0,true);p.setInt32(148,0,true);p.setUint32(156,(1<<21)|1,true);d.wasmdoom_apply_player();
 for(let i=0;i<10;i++){expect(updateExitLock(d,true)).toBeGreaterThan(0);tick();}expect(exited).toBe(false);
 // Model the post-combat health snapshot without relying on nondeterministic aim.
 const count=d.wasmdoom_snapshot_map_objects(),objects=new DataView(d.memory.buffer,d.wasmdoom_map_objects_ptr(),count*32);
 for(let i=0;i<count;i++)if(objects.getUint32(i*32+24,true)&0x400000){objects.setInt32(i*32+20,0,true);objects.setUint32(i*32+28,1,true);}d.wasmdoom_apply_map_objects();
 expect(enemiesRemaining(d)).toBe(0);
 for(let i=0;i<70&&!exited;i++){updateExitLock(d,true);tick();}expect(exited).toBe(true);
});


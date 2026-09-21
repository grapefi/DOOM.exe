import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {bootEngine,type Doom} from '../shared/engine.ts';
type Inspectable=Doom&{wasmdoom_apply_player:()=>number};
const wasm=await readFile('game/doom.wasm');
const engines=await Promise.all(['game/doomexe.wad',process.argv[2]||'game/trimmed/doomexe.wad'].map(async p=>await bootEngine(wasm,await readFile(p)) as Inspectable));
let frames=0,sounds=0,differentFrames=0,maxDifferentPixels=0;
function events(d:Doom){
 const p=d.wasmdoom_events_ptr(),n=d.wasmdoom_events_len(),v=new DataView(d.memory.buffer,p,n),audio:string[]=[];
 for(let i=0;i+4<=n;){const tag=v.getUint16(i,true),len=v.getUint16(i+2,true);
 if(tag===3)throw new Error(new TextDecoder().decode(new Uint8Array(d.memory.buffer,p+i+4,len)));
 if(tag===10){const data=v.getInt32(i+12,true),size=v.getInt32(i+16,true);audio.push(Buffer.from(d.memory.buffer,data,size).toString('base64'));sounds++;}
 i+=4+len;}d.wasmdoom_events_clear();return audio;
}
function ticks(n:number){for(let i=0;i<n;i++){engines.forEach(d=>d.wasmdoom_tick());assert.deepEqual(events(engines[0]),events(engines[1]),'Sound samples differ');const pixels=engines.map(d=>Buffer.from(d.memory.buffer,d.wasmdoom_get_framebuffer(),64000));let diff=0;for(let j=0;j<64000;j++)if(pixels[0][j]!==pixels[1][j])diff++;if(diff)differentFrames++;maxDifferentPixels=Math.max(maxDifferentPixels,diff);engines.forEach(d=>d.wasmdoom_snapshot_player());assert.deepEqual(Buffer.from(engines[0].memory.buffer,engines[0].wasmdoom_player_snapshot_ptr(),164),Buffer.from(engines[1].memory.buffer,engines[1].wasmdoom_player_snapshot_ptr(),164),'Player simulation differs');frames++;}}
function key(k:number,down=true){engines.forEach(d=>down?d.wasmdoom_keydown(k):d.wasmdoom_keyup(k));}
function player(d:Inspectable){d.wasmdoom_snapshot_player();return new DataView(d.memory.buffer,d.wasmdoom_player_snapshot_ptr(),164);}
engines.forEach(events);ticks(35);
for(const d of engines){const p=player(d);p.setInt32(0,10000,true);p.setInt32(68,15,true);p.setInt32(72,1000,true);p.setInt32(76,1000,true);p.setUint32(156,1|(1<<17)|(1<<18),true);d.wasmdoom_apply_player();}
for(const weapon of [49,50,51,52]){key(weapon);ticks(1);key(weapon,false);ticks(40);key(0x9d);key(0xac);ticks(400);key(0x9d,false);key(0xac,false);ticks(10);}
key(9);ticks(20);key(9,false);key(9);ticks(1);key(9,false);
key(27);ticks(20);key(27,false);key(27);ticks(1);key(27,false);
for(const d of engines){const p=player(d);p.setInt32(0,1,true);p.setUint32(156,1,true);d.wasmdoom_apply_player();}
ticks(1200);
assert.equal(player(engines[1]).getInt32(40,true),1,'Must reach dead player state');
console.log('Trim parity passed:',frames,'simulation-equivalent frames; matching sound samples; fist/pistol/shotgun/chaingun, combat, automap, menu and player death.',sounds,'sound events.');


console.log({differentFrames,maxDifferentPixels});

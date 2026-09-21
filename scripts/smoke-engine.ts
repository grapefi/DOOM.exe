import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {bootEngine,type Doom} from '../shared/engine.ts';
const wasm=await readFile('game/doom.wasm'),wad=await readFile(process.argv[2]||'game/doomexe.wad');
type Inspectable=Doom&{wasmdoom_snapshot_map_objects:()=>number;wasmdoom_map_objects_ptr:()=>number;wasmdoom_apply_player:()=>number};
let shots=0,exited=false;
function tick(d:Doom){d.wasmdoom_tick();const p=d.wasmdoom_events_ptr(),n=d.wasmdoom_events_len(),v=new DataView(d.memory.buffer,p,n);for(let i=0;i+4<=n;){const tag=v.getUint16(i,true),len=v.getUint16(i+2,true);if(tag===3)throw new Error(new TextDecoder().decode(new Uint8Array(d.memory.buffer,p+i+4,len)));if(tag===120)shots++;if(tag===102)exited=true;i+=4+len;}d.wasmdoom_events_clear();}
function player(d:Doom){assert.equal(d.wasmdoom_snapshot_player(),1);return new DataView(d.memory.buffer,d.wasmdoom_player_snapshot_ptr(),164);}
const combat=await bootEngine(wasm,wad) as Inspectable;
tick(combat);
const count=combat.wasmdoom_snapshot_map_objects(),objects=new DataView(combat.memory.buffer,combat.wasmdoom_map_objects_ptr(),count*32);
let enemies=0;for(let i=0;i<count;i++)if(objects.getUint32(i*32+24,true)&0x400000)enemies++;
assert.equal(enemies,24,'All 24 enemies must actually spawn in the engine');

const y=player(combat).getInt32(132,true);
combat.wasmdoom_keydown(0xad);combat.wasmdoom_keydown(0x9d);
for(let i=0;i<55;i++)tick(combat);
assert.notEqual(player(combat).getInt32(132,true),y,'Player must move');
combat.wasmdoom_keyup(0xad);
for(let i=0;i<70;i++)tick(combat);
assert.ok(shots>0,'Weapon must fire after the shotgun finishes equipping');
assert.ok(player(combat).getInt32(68,true)&4,'Spawn shotgun must be collected when moving');
const pixels=new Uint8Array(combat.memory.buffer,combat.wasmdoom_get_framebuffer(),64000);
assert.ok(new Set(pixels).size>16,'Engine must render a real game frame');

// Isolate the pickup/exit mechanics from moving enemies, whose collisions make
// a fixed straight-line input recording unsuitable as a combat completion test.
const solo=await bootEngine(wasm,wad,{noMonsters:true}) as Inspectable;
for(let i=0;i<35;i++)tick(solo);
let p=player(solo);p.setInt32(0,50,true);p.setUint32(156,1,true);solo.wasmdoom_apply_player();
const shells=player(solo).getInt32(76,true);
solo.wasmdoom_keydown(44);for(let i=0;i<30;i++)tick(solo);solo.wasmdoom_keyup(44);
for(let i=0;i<12;i++)tick(solo);
assert.ok(player(solo).getInt32(76,true)>shells,'Shell box must replenish ammunition');
// Return to the central lane for a deterministic medikit and exit traversal.
p=player(solo);p.setInt32(128,0,true);p.setInt32(132,-400*65536,true);p.setInt32(144,0,true);p.setInt32(148,0,true);p.setUint32(156,1<<21,true);solo.wasmdoom_apply_player();
solo.wasmdoom_keydown(0xad);for(let i=0;i<185;i++)tick(solo);solo.wasmdoom_keyup(0xad);
assert.ok(player(solo).getInt32(0,true)>50,'Medikits must restore damaged health');
solo.wasmdoom_keydown(32);for(let i=0;i<20;i++)tick(solo);
assert.ok(exited,'North-wall use action must finish the arena');
console.log('Survival smoke passed: 24 live enemies, shotgun pickup, movement, firing, rendering; isolated ammo/health pickups and exit.');

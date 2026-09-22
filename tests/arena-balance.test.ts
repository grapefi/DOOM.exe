import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {balanceArena} from '../shared/arenaBalance';
import {bootEngine} from '../shared/engine';
import {enemiesRemaining} from '../shared/round';
it('keeps exactly two medikits, four ammo boxes and a distant chaingun without changing the source cartridge',async()=>{
 const source=readFileSync('game/doomexe.wad'),original=Buffer.from(source),wad=balanceArena(source),v=new DataView(wad.buffer),dir=v.getUint32(8,true),count=v.getUint32(4,true);
 for(let i=0;i<count;i++){const p=dir+i*16;if(new TextDecoder().decode(wad.subarray(p+8,p+16)).replace(/\0/g,'')!=='THINGS')continue;const things=[];for(let j=v.getUint32(p,true),end=j+v.getUint32(p+4,true);j<end;j+=10)if(v.getUint16(j+8,true)&2)things.push({type:v.getUint16(j+6,true),x:v.getInt16(j,true),y:v.getInt16(j+2,true)});expect(things.filter(t=>t.type===2012)).toHaveLength(2);expect(things.filter(t=>[2048,2049,2007,2008].includes(t.type))).toHaveLength(4);expect(things.filter(t=>t.type===2002)).toEqual([{type:2002,x:0,y:320}]);}
 expect(source.equals(original)).toBe(true);expect(Buffer.from(balanceArena(wad)).equals(Buffer.from(wad))).toBe(true);
 const doom=await bootEngine(readFileSync('game/doom.wasm'),wad);doom.wasmdoom_tick();expect(enemiesRemaining(doom)).toBe(24);
});

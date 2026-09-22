import type {Doom} from './engine';
export type Outcome='complete'|'dead';
export function formatTime(ms:number){
 const centiseconds=Math.floor(Math.max(0,ms)/10);
 return `${String(Math.floor(centiseconds/6000)).padStart(2,'0')}:${String(Math.floor(centiseconds/100)%60).padStart(2,'0')}.${String(centiseconds%100).padStart(2,'0')}`;
}
export function playerIsDead(doom:Doom){
 if(!doom.wasmdoom_snapshot_player())return false;
 const player=new DataView(doom.memory.buffer,doom.wasmdoom_player_snapshot_ptr(),164);
 return player.getInt32(0,true)<=0||player.getInt32(40,true)===1;
}
export function isPlayingLevel(doom:Doom){
 doom.wasmdoom_snapshot_settings();
 const settings=new DataView(doom.memory.buffer,doom.wasmdoom_settings_ptr(),48);
 return settings.getInt32(0,true)===0&&settings.getInt32(40,true)===0;
}

// MF_COUNTKILL identifies enemies; dead bodies retain the flag, so check health.
export function enemiesRemaining(doom:Doom){
 const count=doom.wasmdoom_snapshot_map_objects();
 const objects=new DataView(doom.memory.buffer,doom.wasmdoom_map_objects_ptr(),count*32);
 let alive=0;
 for(let i=0;i<count;i++)if((objects.getUint32(i*32+24,true)&0x400000)&&objects.getInt32(i*32+20,true)>0)alive++;
 return alive;
}
export function updateExitLock(doom:Doom,useHeld:boolean){
 const remaining=enemiesRemaining(doom);
 if(useHeld&&remaining===0)doom.wasmdoom_keydown(32);else doom.wasmdoom_keyup(32);
 return remaining;
}

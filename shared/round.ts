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

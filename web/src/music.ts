import {toMus,wadLump} from '../../shared/music';
const HASH='09f1c044366c65fb3981906854951b5efb076018274d7589fe4edbf6d67de338';
export async function createMusic(audio:AudioContext,wad:Uint8Array){
 const r=await fetch('/audio/wasmdoom.music.wasm');if(!r.ok)throw new Error('Music synthesizer unavailable');
 const bytes=await r.arrayBuffer();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==HASH)throw new Error('Music synthesizer integrity check failed');
 const module=await WebAssembly.compile(bytes);
 await audio.audioWorklet.addModule('/audio/music-worklet.js');
 const node=new AudioWorkletNode(audio,'doom-music',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{module}});
 const gain=audio.createGain();gain.gain.value=.28;node.connect(gain).connect(audio.destination);
 node.port.postMessage({tag:20,values:[],data:wadLump(wad,'GENMIDI')});
 node.port.postMessage({tag:21,values:[1],data:toMus(wadLump(wad,'D_E1M1'))});
 node.port.postMessage({tag:22,values:[1,1]});
 return {
  event(tag:number,values:number[],data?:Uint8Array){node.port.postMessage({tag,values,data});},
  pause(paused:boolean){node.port.postMessage({paused});},
  stop(){node.port.postMessage({destroy:true});node.disconnect();gain.disconnect();node.port.close();}
 };
}


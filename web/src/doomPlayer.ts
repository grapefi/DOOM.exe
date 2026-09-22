import {playerIsDead,isPlayingLevel,updateExitLock,type Outcome} from '../../shared/round';
import {createMusic} from './music';
import {playRoundMusic} from './roundMusic';
import {bootEngine,type Doom} from '../../shared/engine';
const keys:Record<string,number>={ArrowUp:0xad,KeyW:0xad,ArrowDown:0xaf,KeyS:0xaf,ArrowLeft:0xac,ArrowRight:0xae,KeyA:44,KeyD:46,ControlLeft:32,ControlRight:32,Space:0x9d,KeyE:32,ShiftLeft:0xb6,ShiftRight:0xb6,Escape:27,Enter:13,Tab:9,Backspace:127};
export async function startPlayer(canvas:HTMLCanvasElement,wasm:Uint8Array,wad:Uint8Array,audio:AudioContext|null,onEnd:(outcome:Outcome,elapsedMs:number)=>void,onError:(message:string)=>void,onTime:(elapsedMs:number,paused:boolean,remaining?:number)=>void){
 const doom=await bootEngine(wasm,wad),ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Canvas is unavailable');
 const music=audio?await createMusic(audio,wad):null;
 canvas.width=320;canvas.height=200;const image=ctx.createImageData(320,200);
 let stopRoundMusic:(()=>void)|undefined;
 let disposed=false,finished=false,exitReached=false,timer=0,ticks=0;
 const elapsed=()=>Math.round(ticks*1000/35);
 const down=new Map<string,number>();
 const voices=new Map<number,{node:AudioBufferSourceNode;gain:GainNode;pan:StereoPannerNode}>();
 function stopVoice(id:number){const v=voices.get(id);if(v){v.node.stop();v.node.disconnect();v.gain.disconnect();v.pan.disconnect();voices.delete(id);}}
 function drain(){
  const p=doom.wasmdoom_events_ptr(),length=doom.wasmdoom_events_len(),view=new DataView(doom.memory.buffer,p,length);
  for(let pos=0;pos+4<=length;){
   const tag=view.getUint16(pos,true),size=view.getUint16(pos+2,true);pos+=4;
   if(pos+size>length)throw new Error('Malformed engine event');
   const int=(i:number)=>view.getInt32(pos+i*4,true);
   if(tag===3)throw new Error(new TextDecoder().decode(new Uint8Array(doom.memory.buffer,p+pos,size)));
   if(tag===102)exitReached=true;
   if(tag===27&&size===4)music?.event(27,[int(0)]);

   if(audio&&tag===10&&size>=28){
    const id=int(0),data=int(2),len=int(3);stopVoice(id);
    if(len>8&&len<2_000_000){
     const d=new DataView(doom.memory.buffer,data,len),samples=Math.min(d.getUint32(4,true),len-8),rate=d.getUint16(2,true);
     if(samples>0&&rate>=3000&&rate<=48000){
      const buffer=audio.createBuffer(1,samples,rate),output=buffer.getChannelData(0),input=new Uint8Array(doom.memory.buffer,data+8,samples);
      for(let i=0;i<samples;i++)output[i]=(input[i]-128)/128;
      const node=audio.createBufferSource(),gain=audio.createGain(),pan=audio.createStereoPanner();
      node.buffer=buffer;node.playbackRate.value=Math.max(1,int(6))/128;gain.gain.value=Math.max(0,Math.min(1,int(4)/127))*.5;pan.pan.value=Math.max(-1,Math.min(1,(int(5)-128)/128));
      node.connect(gain).connect(pan).connect(audio.destination);voices.set(id,{node,gain,pan});node.onended=()=>{if(voices.get(id)?.node===node){voices.delete(id);node.disconnect();gain.disconnect();pan.disconnect();}};node.start();
     }
    }
   }
   if(audio&&tag===11&&size>=4)stopVoice(int(0));
   if(audio&&tag===12&&size>=16){const v=voices.get(int(0));if(v){v.gain.gain.value=Math.max(0,Math.min(1,int(1)/127))*.5;v.pan.pan.value=Math.max(-1,Math.min(1,(int(2)-128)/128));v.node.playbackRate.value=Math.max(1,int(3))/128;}}
   pos+=size;
  }
  doom.wasmdoom_events_clear();
 }
 function release(){music?.pause(true);for(const k of new Set(down.values()))doom.wasmdoom_keyup(k);down.clear();for(const id of voices.keys())stopVoice(id);}
 function keyboard(event:KeyboardEvent){
  const k=keys[event.code]??(/^Digit[1-7]$/.test(event.code)?event.code.charCodeAt(5):undefined);
  if(k===undefined||finished||disposed)return;event.preventDefault();
  if(event.type==='keydown'){if(!event.repeat&&!down.has(event.code)){down.set(event.code,k);if(k!==32)doom.wasmdoom_keydown(k);}}
  else{down.delete(event.code);if(![...down.values()].includes(k))doom.wasmdoom_keyup(k);}
 }
 const focus=()=>{if(!finished&&!document.hidden){music?.pause(false);onTime(elapsed(),false);}};
 const blur=()=>{release();if(!finished)onTime(elapsed(),true);};
 canvas.addEventListener('keydown',keyboard);canvas.addEventListener('keyup',keyboard);canvas.addEventListener('blur',blur);canvas.addEventListener('focus',focus);
 const visibility=()=>{if(document.hidden)blur();else if(document.activeElement===canvas)focus();};document.addEventListener('visibilitychange',visibility);
 function draw(){const pixels=new Uint8Array(doom.memory.buffer,doom.wasmdoom_get_framebuffer(),64000),palette=new Uint8Array(doom.memory.buffer,doom.wasmdoom_get_palette(),768);for(let i=0;i<64000;i++){const c=pixels[i]*3;image.data[i*4]=palette[c];image.data[i*4+1]=palette[c+1];image.data[i*4+2]=palette[c+2];image.data[i*4+3]=255;}ctx!.putImageData(image,0,0);}
 const stop=()=>{if(disposed)return;disposed=true;clearInterval(timer);release();music?.stop();stopRoundMusic?.();canvas.removeEventListener('keydown',keyboard);canvas.removeEventListener('keyup',keyboard);canvas.removeEventListener('blur',blur);canvas.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);};
 function step(){
  if(isPlayingLevel(doom))ticks++;
  const remaining=updateExitLock(doom,[...down.values()].includes(32));
  doom.wasmdoom_tick();drain();draw();
  const outcome=playerIsDead(doom)?'dead':exitReached&&remaining===0?'complete':null;
  if(outcome){finished=true;clearInterval(timer);release();if(audio)stopRoundMusic=playRoundMusic(audio,outcome);onTime(elapsed(),false);onEnd(outcome,elapsed());}
  else onTime(elapsed(),!isPlayingLevel(doom),remaining);
 }
 try{drain();}catch(e){stop();throw e;}
 timer=window.setInterval(()=>{if(disposed||finished||document.hidden||document.activeElement!==canvas)return;try{step();}catch(e){stop();onError(e instanceof Error?e.message:'Engine stopped');}},1000/35);
 canvas.focus();return stop;
}

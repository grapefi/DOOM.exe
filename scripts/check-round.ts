import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {startPlayer} from '../web/src/doomPlayer';
import {formatTime,type Outcome} from '../shared/round';
const doc=Object.assign(new EventTarget(),{activeElement:null as unknown,hidden:false});
Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
let frame=()=>{};
Object.defineProperty(globalThis,'window',{value:{setInterval(callback:()=>void){frame=callback;return 1;}}});
class Canvas extends EventTarget {
 width=0;height=0;
 getContext(){return {createImageData:()=>({data:new Uint8ClampedArray(320*200*4)}),putImageData:()=>{}};}
 focus(){doc.activeElement=this;this.dispatchEvent(new Event('focus'));}
 blur(){doc.activeElement=null;this.dispatchEvent(new Event('blur'));}
 key(code:string,type='keydown'){this.dispatchEvent(Object.assign(new Event(type,{cancelable:true}),{code,repeat:false}));}
}
const wasm=await readFile('game/doom.wasm'),wad=await readFile('game/doomexe.wad');
const canvas=new Canvas();let latest=0,paused=false;const endings:{outcome:Outcome;time:number}[]=[];
const launch=()=>startPlayer(canvas as unknown as HTMLCanvasElement,wasm,wad,null,(outcome,time)=>endings.push({outcome,time}),message=>{throw new Error(message);},(time,pause)=>{latest=time;paused=pause;});
let stop=await launch();
for(let i=0;i<10;i++)frame();assert.ok(latest>0);
canvas.blur();const before=latest;for(let i=0;i<40;i++)frame();assert.equal(latest,before);assert.equal(paused,true);
canvas.focus();
for(let i=0;i<3500&&!endings.length;i++)frame();
assert.equal(endings[0]?.outcome,'dead','Real engine death must end the round');
const finalTime=latest;for(let i=0;i<100;i++)frame();assert.equal(latest,finalTime);assert.equal(endings.length,1);
stop();latest=0;stop=await launch();for(let i=0;i<3;i++)frame();assert.ok(latest>0&&latest<1000,'Replay must start a fresh timer');assert.equal(endings.length,1);stop();
assert.equal(formatTime(62340),'01:02.34');
console.log('Round checks passed with real WASM: timer advances, focus pause, natural death ends once, final time freezes, replay starts fresh.');


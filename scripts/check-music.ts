import {toMus,wadLump} from '../shared/music.ts';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let Processor:any;
vm.runInNewContext(await readFile('web/public/audio/music-worklet.js','utf8'),{
 AudioWorkletProcessor:class{port={onmessage:null};},registerProcessor:(_n:string,p:unknown)=>{Processor=p;},
 WebAssembly,Uint8Array,Float32Array,sampleRate:44100
});
const module=await WebAssembly.compile(new Uint8Array(await readFile('web/public/audio/wasmdoom.music.wasm')));
const worklet=new Processor({processorOptions:{module}});
const wad=await readFile(process.argv[2]||'game/trimmed/doomexe.wad');
worklet.port.onmessage({data:{tag:20,values:[],data:wadLump(wad,'GENMIDI')}});
worklet.port.onmessage({data:{tag:21,values:[1],data:toMus(wadLump(wad,'D_E1M1'))}});
worklet.port.onmessage({data:{tag:22,values:[1,1]}});
let energy=0;
for(let i=0;i<700;i++){const out=[new Float32Array(128),new Float32Array(128)];assert.equal(worklet.process([], [out]),true);for(const ch of out)for(const x of ch){assert.ok(Number.isFinite(x));energy+=x*x;}}
assert.ok(energy>1,'Level music must produce audible nonzero samples');
worklet.port.onmessage({data:{paused:true}});
const out=[new Float32Array(128),new Float32Array(128)];worklet.process([],[out]);assert.ok(out.every(c=>c.every(x=>x===0)));
worklet.port.onmessage({data:{paused:false}});
let resumed=0;for(let i=0;i<20;i++){worklet.process([],[out]);resumed+=out[0].reduce((a,x)=>a+x*x,0);}assert.ok(resumed>0);
worklet.port.onmessage({data:{destroy:true}});assert.equal(worklet.process([],[out]),false);
console.log('Music passed: actual Freedoom level track, stereo synthesis, finite nonzero PCM, focus pause/resume, disposal. Energy:',energy.toFixed(2));


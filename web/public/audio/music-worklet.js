// GPL-2.0-or-later. wasmdoom v0.0.2 music event bridge.
class DoomMusic extends AudioWorkletProcessor {
 constructor(options){
  super();this.synth=new WebAssembly.Instance(options.processorOptions.module,{}).exports;
  this.synth.wasmdoom_music_init(sampleRate);this.paused=false;this.disposed=false;
  this.port.onmessage=({data:m})=>{
   if(m.destroy){this.disposed=true;return;}
   if(typeof m.paused==='boolean'){this.paused=m.paused;return;}
   const e=this.synth,v=m.values;
   if(m.tag===20||m.tag===21){
    const p=e.wasmdoom_music_alloc(m.data.length);
    if(!p)throw new Error('Music data exceeds synth capacity');
    new Uint8Array(e.memory.buffer,p,m.data.length).set(m.data);
    if(m.tag===20)e.wasmdoom_music_set_genmidi(p,m.data.length);
    else e.wasmdoom_music_register(v[0],p,m.data.length);
   }else{
    const fn={22:'play',23:'pause',24:'resume',25:'stop',26:'unregister',27:'set_volume'}[m.tag];
    if(fn)e['wasmdoom_music_'+fn](...v);
   }
  };
 }
 process(inputs,outputs){
  if(this.disposed)return false;
  const out=outputs[0];if(this.paused||!out.length)return true;
  const e=this.synth,n=out[0].length,p=e.wasmdoom_music_render(n);
  const samples=new Float32Array(e.memory.buffer,p,n*2);
  for(let i=0;i<n;i++){out[0][i]=samples[i*2];out[1][i]=samples[i*2+1];}
  return true;
 }
}
registerProcessor('doom-music',DoomMusic);


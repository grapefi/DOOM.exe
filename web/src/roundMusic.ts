import type {Outcome} from '../../shared/round';

// Original industrial-metal stings: distorted power chords, drums and falling drones.
export function playRoundMusic(audio:AudioContext,outcome:Outcome){
 const start=audio.currentTime+.03,master=audio.createGain(),compressor=audio.createDynamicsCompressor();
 master.gain.value=.3;compressor.threshold.value=-18;compressor.ratio.value=8;compressor.attack.value=.003;compressor.release.value=.15;
 master.connect(compressor).connect(audio.destination);
 const nodes:AudioNode[]=[master,compressor],sources:AudioScheduledSourceNode[]=[];
 const distortion=audio.createWaveShaper(),cabinet=audio.createBiquadFilter();
 const curve=new Float32Array(4096);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=Math.tanh(x*7);}
 distortion.curve=curve;distortion.oversample='4x';cabinet.type='lowpass';cabinet.frequency.value=2600;cabinet.Q.value=.7;
 distortion.connect(cabinet).connect(master);nodes.push(distortion,cabinet);
 const noise=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),samples=noise.getChannelData(0);
 for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
 function envelope(at:number,duration:number,volume:number,destination:AudioNode){const g=audio.createGain(),t=start+at;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);g.connect(destination);nodes.push(g);return g;}
 function tone(note:number,at:number,duration:number,volume:number,destination:AudioNode=distortion,fall=1){
  for(const detune of [-6,6]){const o=audio.createOscillator(),t=start+at,f=440*2**((note-69)/12);o.type='sawtooth';o.detune.value=detune;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*fall,t+duration);o.connect(envelope(at,duration,volume/2,destination));o.start(t);o.stop(t+duration+.03);sources.push(o);nodes.push(o);}
 }
 function chord(note:number,at:number,duration:number){tone(note,at,duration,.12);tone(note+7,at,duration,.075);tone(note+12,at,duration,.04);}
 function kick(at:number){const o=audio.createOscillator(),t=start+at;o.frequency.setValueAtTime(135,t);o.frequency.exponentialRampToValueAtTime(38,t+.18);o.connect(envelope(at,.28,.9,master));o.start(t);o.stop(t+.3);sources.push(o);nodes.push(o);}
 function hit(at:number,duration:number,volume:number,freq:number){const n=audio.createBufferSource(),filter=audio.createBiquadFilter();n.buffer=noise;filter.type='highpass';filter.frequency.value=freq;n.connect(filter).connect(envelope(at,duration,volume,master));n.start(start+at);n.stop(start+at+duration+.03);sources.push(n);nodes.push(n,filter);}
 if(outcome==='complete'){
  // Fast palm-muted low-E riff, pounding backbeat, then a sustained power chord.
  [28,28,40,28,31,28,34,33,28,28,40,28,31,33,35,28].forEach((n,i)=>{chord(n,i*.18,.16);if(i%4===0||i%4===2)kick(i*.18);if(i%4===2)hit(i*.18,.16,.35,900);hit(i*.18,.055,.075,6500);});
  chord(28,2.95,2);kick(2.95);hit(2.95,1.4,.24,4200);
 }else{
  // Slower chromatic collapse, distorted bass slide and a gritty impact tail.
  [34,33,31,28].forEach((n,i)=>{chord(n,i*.48,.65);kick(i*.48);hit(i*.48,.22,.18,650);});
  tone(28,1.95,2.7,.13,distortion,.48);tone(34,1.95,2.4,.05,distortion,.5);kick(1.95);hit(1.95,1.7,.22,320);
 }
 let stopped=false;
 const cleanup=()=>{if(stopped)return;stopped=true;for(const source of sources){try{source.stop();}catch{}}for(const node of nodes)node.disconnect();};
 const timer=window.setTimeout(cleanup,5600);
 return()=>{clearTimeout(timer);cleanup();};
}

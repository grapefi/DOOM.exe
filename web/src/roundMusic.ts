import type {Outcome} from '../../shared/round';

// Original short FM-era riffs; no external recording or download required.
export function playRoundMusic(audio:AudioContext,outcome:Outcome){
 const start=audio.currentTime+.03,master=audio.createGain();
 master.gain.value=.16;master.connect(audio.destination);
 const sources:OscillatorNode[]=[];
 const tone=(note:number,at:number,duration:number,type:OscillatorType='square',volume=.4)=>{
  const osc=audio.createOscillator(),envelope=audio.createGain(),t=start+at;
  osc.type=type;osc.frequency.value=440*2**((note-69)/12);
  envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(volume,t+.012);
  envelope.gain.exponentialRampToValueAtTime(.001,t+duration);
  osc.connect(envelope).connect(master);osc.start(t);osc.stop(t+duration+.02);
  osc.onended=()=>{osc.disconnect();envelope.disconnect();};sources.push(osc);
 };
 if(outcome==='complete'){
  [52,52,55,59,64,62,64].forEach((n,i)=>tone(n,i*.24,i===6?1.7:.23));
  [40,40,43,47,40,43,47].forEach((n,i)=>tone(n,i*.24,.3,'triangle',.7));
  [52,59,64].forEach(n=>tone(n,2.05,1.6,'triangle',.35));
 }else{
  [52,51,47,46,40].forEach((n,i)=>tone(n,i*.42,i===4?2:.48,'sawtooth',.3));
  [28,35,28].forEach((n,i)=>tone(n,i*.65,1.5,'triangle',.65));
 }
 // Release resources on replay/reset, including notes scheduled in the future.
 const cleanup=()=>{for(const source of sources){try{source.stop();}catch{}}master.disconnect();};
 const timer=window.setTimeout(()=>master.disconnect(),4500);
 return()=>{clearTimeout(timer);cleanup();};
}

// Convert standard MIDI type 0/1 to Doom MUS (140 ticks/second).
// Used only with licensed Freedoom music. No external synthesis service.
export function toMus(input:Uint8Array):Uint8Array{
 const bytes=new Uint8Array(input),v=new DataView(bytes.buffer),name=(p:number,n:number)=>new TextDecoder().decode(bytes.subarray(p,p+n));
 if(name(0,4)==='MUS\x1a')return bytes;
 if(name(0,4)!=='MThd'||v.getUint16(8)>1)throw new Error('Unsupported level music format');
 const ppq=v.getUint16(12);if(ppq&0x8000)throw new Error('SMPTE MIDI is unsupported');
 type E={tick:number;order:number;tempo?:number;status?:number;a?:number;b?:number};
 const events:E[]=[];let offset=8+v.getUint32(4),order=0,endTick=0;
 for(let t=0;t<v.getUint16(10);t++){
  if(name(offset,4)!=='MTrk')throw new Error('Invalid MIDI track');
  const end=offset+8+v.getUint32(offset+4);let p=offset+8,tick=0,running=0;
  const variable=()=>{let n=0,c=0;do{if(p>=end)throw new Error('Truncated MIDI');c=bytes[p++];n=n*128+(c&127);}while(c&128);return n;};
  while(p<end){tick+=variable();let status=bytes[p];if(status&128){p++;if(status<240)running=status;}else status=running;
   if(status===255){const type=bytes[p++],len=variable();if(type===81&&len===3)events.push({tick,order:order++,tempo:bytes[p]*65536+bytes[p+1]*256+bytes[p+2]});p+=len;continue;}
   if(status===240||status===247){const len=variable();p+=len;continue;}
   if(status<128||status>=240)throw new Error('Invalid MIDI status');
   const a=bytes[p++],b=(status>>4)===12||(status>>4)===13?undefined:bytes[p++];events.push({tick,order:order++,status,a,b});
  }endTick=Math.max(endTick,tick);offset=end;
 }
 events.sort((a,b)=>a.tick-b.tick||a.order-b.order);
 const channels=new Map<number,number>(),instruments=new Set<number>();let previous=0,micros=0,tempo=500000;
 const score:{time:number;data:number[]}[]=[];
 for(const e of events){
  micros+=(e.tick-previous)*tempo/ppq;previous=e.tick;
  if(e.tempo){tempo=e.tempo;continue;}
  const status=e.status!,ch=status&15,type=status>>4,a=e.a!,b=e.b??0;
  if(!channels.has(ch))channels.set(ch,ch===9?15:[...channels.values()].filter(x=>x!==15).length);
  const c=channels.get(ch)!;if(c>15)throw new Error('Too many music channels');
  let data:number[]|undefined;
  if(type===8||(type===9&&b===0))data=[c,a];
  if(type===9&&b>0){data=[16|c,a|128,b];if(ch===9)instruments.add(128+a);}
  if(type===12){data=[64|c,0,a];instruments.add(a);}
  if(type===14)data=[32|c,((b<<7)|a)>>6];
  if(type===11){const controller=[0,1,7,10,11,91,93,64,67].indexOf(a);if(controller>=0)data=[64|c,controller+1,b];const system=[120,123,126,127,121].indexOf(a);if(system>=0)data=[48|c,system+10];}
  if(data)score.push({time:Math.round(micros*140/1e6),data});
 }
 const endTime=Math.round((micros+(endTick-previous)*tempo/ppq)*140/1e6),out:number[]=[];
 const delay=(n:number)=>{const b=[n&127];while((n=Math.floor(n/128))>0)b.unshift((n&127)|128);out.push(...b);};
 // A silent controller event preserves any initial rest.
 if(score[0]?.time>0){out.push(192,3,127);delay(score[0].time);}
 for(let i=0;i<score.length;i++){const e=score[i],last=i===score.length-1||score[i+1].time!==e.time;out.push(e.data[0]|(last?128:0),...e.data.slice(1));if(last)delay((score[i+1]?.time??endTime)-e.time);}
 out.push(96);
 const list=[...instruments],start=16+list.length*2;if(out.length>65535)throw new Error('MUS track too large');
 const result=new Uint8Array(start+out.length),h=new DataView(result.buffer);result.set([77,85,83,26]);h.setUint16(4,out.length,true);h.setUint16(6,start,true);h.setUint16(8,[...channels.keys()].filter(c=>c!==9).length,true);h.setUint16(12,list.length,true);list.forEach((n,i)=>h.setUint16(16+i*2,n,true));result.set(out,start);return result;
}
export function wadLump(wad:Uint8Array,name:string):Uint8Array{
 const v=new DataView(wad.buffer,wad.byteOffset,wad.byteLength),n=v.getUint32(4,true),d=v.getUint32(8,true);
 for(let i=n-1;i>=0;i--){const p=d+i*16;if(new TextDecoder().decode(wad.subarray(p+8,p+16)).replace(/\0/g,'')===name)return wad.slice(v.getUint32(p,true),v.getUint32(p,true)+v.getUint32(p+4,true));}
 throw new Error('Missing music resource '+name);
}


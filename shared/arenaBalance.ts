// Apply current arena balance to a copy after the on-chain cartridge is verified.
// Stored cartridge bytes remain unchanged; the preview uses this local rules overlay.
export function balanceArena(input:Uint8Array){
 const wad=new Uint8Array(input),v=new DataView(wad.buffer),count=v.getUint32(4,true),directory=v.getUint32(8,true);
 if(directory+count*16>wad.length)throw new Error('Invalid arena directory');
 let maps=0;
 for(let i=0;i<count;i++){
  const record=directory+i*16,name=new TextDecoder().decode(wad.subarray(record+8,record+16)).replace(/\0/g,'');
  if(name!=='THINGS')continue;
  const offset=v.getUint32(record,true),size=v.getUint32(record+4,true);
  if(offset+size>wad.length||size%10)throw new Error('Invalid arena things');
  let health=0,shells=0,bullets=0,chainguns=0;
  for(let p=offset;p<offset+size;p+=10){
   const type=v.getUint16(p+6,true);
   let target:readonly number[]|undefined;
   if(type===2002){target=chainguns++===0?[0,320]:undefined;}
   else if([2011,2012,2014].includes(type)){target=[[-432,160],[432,160]][health++];if(target)v.setUint16(p+6,2012,true);}
   else if(type===2049||type===2008){target=[[-432,-240],[432,-240]][shells++];if(target)v.setUint16(p+6,2049,true);}
   else if(type===2048||type===2007){target=[[-432,320],[432,320]][bullets++];if(target)v.setUint16(p+6,2048,true);}
   else continue;
   v.setUint16(p+8,target?7:0,true);
   if(target){v.setInt16(p,target[0],true);v.setInt16(p+2,target[1],true);}
  }
  if(health<2||shells<2||bullets<2||chainguns<1)throw new Error('Unsupported arena supplies');
  maps++;
 }
 if(!maps)throw new Error('Arena map missing');
 return wad;
}

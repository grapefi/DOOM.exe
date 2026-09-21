import {toMus} from '../shared/music.ts';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {keccak256} from 'viem';
import {pack,split} from '../shared/rom.ts';
// Deliberately specific to the EXECUTION arena in scripts/wad.ts.
// Keep complete sprite families: all rotations, attack, pain and death frames.
const sprites=new Set('PLAY POSS TROO SARG PUFF BLUD BAL1 ARM1 MEDI CLIP AMMO SHEL SBOX SHOT MGUN PUNG PISG PISF SHTG SHTF CHGG CHGF'.split(' '));
// Keep shared and menu sounds; remove only effects belonging to absent weapons/enemies.
const unusedSounds=new Set('SAWUP SAWIDL SAWFUL SAWHIT RLAUNC PLASMA BFG VIPAIN MNPAIN PEPAIN CACSIT BRSSIT CYBSIT SPISIT BSPSIT KNTSIT VILSIT MANSIT PESIT SKLATK SKEPCH VILATK CACDTH SKLDTH BRSDTH CYBDTH SPIDTH BSPDTH VILDTH PEDTH SKEDTH BSPWLK HOOF METAL FLAME FLAMST BOSPIT BOSSIT BOSPN BOSDTH MANATK MANDTH SSSIT SSDTH KEENPN KEENDT SKEACT SKESIT SKEATK'.split(' ').map(n=>'DS'+n));
const flats=new Set('FLOOR0_1 CEIL1_1 F_SKY1 FLOOR7_2 GRNROCK FLOOR4_8 SFLR6_1 MFLR8_4 MFLR8_3'.split(' '));
const textures=new Set('STARTAN3 SKY1 SKY2 SKY3 SKY4'.split(' '));
const input=await readFile('game/doomexe.wad'),wasm=await readFile('game/doom.wasm');
const provenance=JSON.parse(await readFile('game/provenance.json','utf8'));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
if(sha(input)!==provenance.wad.sha256||sha(wasm)!==provenance.engine.sha256)throw new Error('Source assets differ from provenance');
type Lump={name:string;data:Buffer};
const lumps:Lump[]=[];
for(let i=0,n=input.readUInt32LE(4),d=input.readUInt32LE(8);i<n;i++){
 const p=d+i*16,o=input.readUInt32LE(p),s=input.readUInt32LE(p+4);
 lumps.push({name:input.toString('ascii',p+8,p+16).replace(/\0/g,''),data:input.subarray(o,o+s)});
}
const pnames=lumps.find(l=>l.name==='PNAMES')!.data;
const names=Array.from({length:pnames.readUInt32LE(0)},(_,i)=>pnames.toString('ascii',4+i*8,12+i*8).replace(/\0/g,''));
const usedPatches=new Set<string>();
// Rebuild texture directories and their patch indexes together.
// Switch textures are retained because the unmodified engine initializes a global switch table.
const texEntries=new Map<string,Buffer[]>();
for(const lump of lumps.filter(l=>/^TEXTURE[12]$/.test(l.name))){
 const entries:Buffer[]=[];
 for(let i=0;i<lump.data.readUInt32LE(0);i++){
  const o=lump.data.readUInt32LE(4+i*4),name=lump.data.toString('ascii',o,o+8).replace(/\0/g,'');
  if(!textures.has(name)&&!/^SW[12]/.test(name)&&i!==0)continue;
  const count=lump.data.readUInt16LE(o+20),data=Buffer.from(lump.data.subarray(o,o+22+count*10));
  for(let j=0;j<count;j++)usedPatches.add(names[data.readUInt16LE(22+j*10+4)]);
  entries.push(data);
 }
 texEntries.set(lump.name,entries);
}
const retainedNames=names.filter(n=>usedPatches.has(n));
const newPnames=Buffer.alloc(4+8*retainedNames.length);newPnames.writeUInt32LE(retainedNames.length);
retainedNames.forEach((n,i)=>newPnames.write(n,4+i*8,8,'ascii'));
const replacements=new Map<string,Buffer>([['PNAMES',newPnames]]);
for(const [name,entries] of texEntries){
 const header=Buffer.alloc(4+entries.length*4);header.writeUInt32LE(entries.length);let offset=header.length;
 entries.forEach((e,i)=>{header.writeUInt32LE(offset,4+i*4);offset+=e.length;for(let j=0;j<e.readUInt16LE(20);j++){const p=22+j*10+4;e.writeUInt16LE(retainedNames.indexOf(names[e.readUInt16LE(p)]),p);}});
 replacements.set(name,Buffer.concat([header,...entries]));
}
// Valid MUS header plus end-of-score event. Named entries remain for hard-coded lookups.
const silent=Buffer.from([77,85,83,26,1,0,16,0,0,0,0,0,0,0,0,0,96]);
let section='';const kept:Lump[]=[],removed:{name:string;bytes:number}[]=[];
for(const lump of lumps){
 const n=lump.name;
 if(['S_START','P_START','F_START'].includes(n))section=n[0];
 if(['S_END','P_END','F_END'].includes(n))section='';
 const marker=lump.data.length===0;
 const discard=!marker&&((section==='S'&&!sprites.has(n.slice(0,4)))||(section==='P'&&!usedPatches.has(n))||(section==='F'&&!flats.has(n))||unusedSounds.has(n)||n.startsWith('DP')||n==='DMXGUS');
 if(discard){removed.push({name:n,bytes:lump.data.length});continue;}
 kept.push({name:n,data:replacements.get(n)??(n==='D_E1M1'?Buffer.from(toMus(lump.data)):n.startsWith('D_')&&n!=='D_E1M1'?silent:lump.data)});
}
let offset=12;const records=kept.map(l=>{const r=Buffer.alloc(16);r.writeUInt32LE(offset);r.writeUInt32LE(l.data.length,4);r.write(l.name,8,8,'ascii');offset+=l.data.length;return r;});
const head=Buffer.alloc(12);head.write('IWAD');head.writeUInt32LE(kept.length,4);head.writeUInt32LE(offset,8);
const wad=Buffer.concat([head,...kept.map(l=>l.data),...records]),raw=pack(wasm,wad),rom=gzipSync(raw,{level:9});
const old=gzipSync(pack(wasm,input),{level:9});
const meta={version:1,compressedHash:keccak256(rom),rawHash:keccak256(raw),compressedSize:rom.length,rawSize:raw.length};
await mkdir('game/trimmed',{recursive:true});await mkdir('web/public/rom-trimmed',{recursive:true});
await writeFile('game/trimmed/doomexe.wad',wad);
await writeFile('web/public/rom-trimmed/rom.bin',rom);
await writeFile('web/public/rom-trimmed/manifest.json',JSON.stringify(meta,null,2));
await writeFile('web/public/rom-trimmed/provenance.json',JSON.stringify({...provenance,wad:{sha256:sha(wad),sourceSha256:sha(input),description:'EXECUTION arena with unused sprite/texture/flat data removed and Freedoom E1M1 music and GENMIDI retained; other tracks replaced by silent MUS entries; shared digital sound effects and menu resources retained.'}},null,2));
const report={originalWadBytes:input.length,trimmedWadBytes:wad.length,originalCompressedBytes:old.length,trimmedCompressedBytes:rom.length,savedCompressedBytes:old.length-rom.length,savedPercent:100*(1-rom.length/old.length),originalChunks:split(old).length,trimmedChunks:split(rom).length,removedLumps:removed.length,music:'Freedoom E1M1 level music; other tracks silent',removed};
await writeFile('game/trimmed/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,removed:undefined},null,2));


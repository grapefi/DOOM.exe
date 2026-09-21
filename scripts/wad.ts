// Original map geometry: crowded survival arena with 24 enemies, supplies and a north-wall exit.
export function makeArena(input: Uint8Array) {
  const source = Buffer.from(input), n=source.readUInt32LE(4), dir=source.readUInt32LE(8);
  if(source.toString('ascii',0,4)!=='IWAD'||dir+n*16>source.length) throw new Error('Invalid Freedoom IWAD');
  const lumps: {name:string; data:Buffer}[]=[];
  for(let i=0;i<n;i++) {
    const p=dir+i*16,name=source.toString('ascii',p+8,p+16).replace(/\0/g,'');
    if(/^E\dM\d$/.test(name)||/^MAP\d\d$/.test(name)) { i+=10; continue; }
    if(/^DEMO\d$/.test(name)) continue;
    const offset=source.readUInt32LE(p),size=source.readUInt32LE(p+4);
    if(offset+size>source.length) throw new Error('Bad Freedoom lump');
    lumps.push({name,data:source.subarray(offset,offset+size)});
  }
  const shorts=(values:number[])=>{ const b=Buffer.alloc(values.length*2);values.forEach((v,i)=>b.writeUInt16LE(v&65535,i*2)); return b; };
  const name8=(s:string)=>{const b=Buffer.alloc(8);b.write(s);return b;};
  const vertices=shorts([-512,-512,-512,512,512,512,512,-512]);
  const sides=Buffer.concat(Array.from({length:4},(_,i)=>Buffer.concat([shorts([0,0]),name8('-'),name8('-'),name8(i===1?'SW1EXIT':'STARTAN3'),shorts([0])])));
  const lines=shorts([0,1,1,0,0,0,65535, 1,2,1,11,0,1,65535, 2,3,1,0,0,2,65535, 3,0,1,0,0,3,65535]);
  const sectors=Buffer.concat([shorts([0,128]),name8('FLOOR0_1'),name8('CEIL1_1'),shorts([192,0,0])]);
  // Doom-format things: x, y, facing angle, editor type, skill flags.
  // Eight former humans, twelve imps and four melee demons, all using Freedoom art.
  // The southern quarter gives the player space to collect weapons before contact.
  const enemyRows = [
    [3004,3001,3001,3001,3001,3004],
    [3001,3002,3004,3004,3002,3001],
    [3004,3001,3001,3001,3001,3004],
    [3001,3002,3004,3004,3002,3001],
  ];
  const spawns:number[][] = [[0,-400,90,1,7]];
  enemyRows.forEach((row,r)=>row.forEach((type,c)=>spawns.push([-400+c*160,-80+r*160,270,type,7])));
  // Shotgun at spawn; chaingun to the right; armor just ahead.
  spawns.push([0,-400,0,2001,7],[64,-400,0,2002,7],[0,-350,0,2018,7]);
  // Six shell boxes and six bullet boxes: sweep the perimeter to stay supplied.
  for(const [x,y] of [[-96,-400],[128,-400],[-432,-240],[432,-240],[-432,320],[432,320]])spawns.push([x,y,0,2049,7]);
  for(const [x,y] of [[-160,-400],[192,-400],[-432,0],[432,0],[-240,448],[240,448]])spawns.push([x,y,0,2048,7]);
  // Eight medikits, including two along the central escape route.
  for(const [x,y] of [[-320,-320],[320,-320],[-432,-160],[432,-160],[-432,160],[432,160],[0,120],[0,400]])spawns.push([x,y,0,2012,7]);
  const things=shorts(spawns.flat());
  const segs=shorts([0,1,16384,0,0,0, 1,2,0,1,0,0, 2,3,49152,2,0,0, 3,0,32768,3,0,0]);
  const blockmap=shorts([-512,-512,9,9,...Array(81).fill(85),0,0,1,2,3,65535]);
  const map=[['THINGS',things],['LINEDEFS',lines],['SIDEDEFS',sides],['VERTEXES',vertices],['SEGS',segs],['SSECTORS',shorts([4,0])],['NODES',Buffer.alloc(0)],['SECTORS',sectors],['REJECT',Buffer.from([0])],['BLOCKMAP',blockmap]] as const;
  // Every menu slot points to the same original arena, preventing missing-map crashes.
  for(let ep=1;ep<=4;ep++) for(let m=1;m<=9;m++) { lumps.push({name:`E${ep}M${m}`,data:Buffer.alloc(0)});for(const [name,data] of map) lumps.push({name,data}); }
  let offset=12; const records:Buffer[]=[];
  for(const lump of lumps) { const r=Buffer.alloc(16);r.writeUInt32LE(offset);r.writeUInt32LE(lump.data.length,4);r.write(lump.name,8,8,'ascii');records.push(r);offset+=lump.data.length; }
  const header=Buffer.alloc(12);header.write('IWAD');header.writeUInt32LE(lumps.length,4);header.writeUInt32LE(offset,8);
  return Buffer.concat([header,...lumps.map(l=>l.data),...records]);
}

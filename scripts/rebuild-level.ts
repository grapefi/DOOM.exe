import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeArena} from './wad.ts';
// Reuse verified Freedoom resources; replace only the generated map lumps.
const old=await readFile('game/doomexe.wad');
const provenance=JSON.parse(await readFile('game/provenance.json','utf8'));
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
if(sha(old)!==provenance.wad.sha256)throw new Error('Existing WAD differs from its recorded provenance');
const wad=makeArena(old);
provenance.wad.sha256=sha(wad);
provenance.wad.description='Original EXECUTION survival arena: 24 enemies, shotgun at spawn, chaingun in the northern arena, ammo, two medikits and armor; Freedoom 0.13.0 resources only';
await writeFile('game/doomexe.wad',wad);
await writeFile('game/provenance.json',JSON.stringify(provenance,null,2));
console.log('Rebuilt survival arena from verified local Freedoom resources.');

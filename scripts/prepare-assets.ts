import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import { makeArena } from './wad.ts';
const ENGINE_REV = '3edb40afadefe6b2d2955e02fa83b74f1b89bc7f';
const ENGINE_SHA = 'caa3d9152830738325d0b0b2b1448c4cef25edeed1e3a5f979f6c7bbfada1683';
const root = 'https://github.com';
async function download(url: string) { const r = await fetch(url); if(!r.ok) throw new Error(`Download failed: ${r.status} ${url}`); return new Uint8Array(await r.arrayBuffer()); }
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
for(const dir of ['game','work','web/public/source','web/public/licenses']) await mkdir(dir,{recursive:true});
const wasm = await download(`${root}/theMagicalKarp/wasmdoom/releases/download/v0.0.2/wasmdoom.wasm`);
if(sha(wasm) !== ENGINE_SHA) throw new Error('Engine checksum mismatch');
const zip = await download(`${root}/freedoom/freedoom/releases/download/v0.13.0/freedoom-0.13.0.zip`);
const checksum = new TextDecoder().decode(await download(`${root}/freedoom/freedoom/releases/download/v0.13.0/freedoom-0.13.0-CHECKSUM`));
const digest = sha(zip);
if(digest !== '3f9b264f3e3ce503b4fb7f6bdcb1f419d93c7b546f4df3e874dd878db9688f59') throw new Error('Pinned Freedoom archive checksum mismatch');
if(!checksum.split('\n').some(line => line.includes('freedoom-0.13.0.zip') && line.includes(digest))) throw new Error('Freedoom release checksum mismatch');
const entries = unzipSync(zip);
const wadEntry = Object.entries(entries).find(([name]) => name.endsWith('/freedoom1.wad'));
if(!wadEntry) throw new Error('Freedoom IWAD not found');
const wad = makeArena(wadEntry[1]);
await writeFile('game/doom.wasm',wasm);
await writeFile('game/doomexe.wad',wad);
for(const [name, bytes] of Object.entries(entries)) if(/(COPYING|CREDITS|LICENSE)(\.txt)?$/i.test(name)) await writeFile('web/public/licenses/'+name.split('/').at(-1),bytes);
// Fetch only build sources; never download upstream's proprietary wads/ directory.
const treeResponse = await fetch(`https://api.github.com/repos/theMagicalKarp/wasmdoom/git/trees/${ENGINE_REV}?recursive=1`);
if(!treeResponse.ok) throw new Error('Could not fetch engine source tree');
const tree = await treeResponse.json() as {tree: {path:string;type:string}[]; truncated:boolean};
if(tree.truncated) throw new Error('Incomplete source tree');
const paths = tree.tree.filter(e => e.type === 'blob' && (e.path.startsWith('src/') || ['build.zig','LICENSE','mise.toml','mise.lock'].includes(e.path)));
const sources: Record<string, Uint8Array> = {};
for(let i=0;i<paths.length;i+=8) {
  await Promise.all(paths.slice(i,i+8).map(async e => { sources[e.path] = await download(`https://raw.githubusercontent.com/theMagicalKarp/wasmdoom/${ENGINE_REV}/${e.path}`); }));
  console.log(`Source files ${Math.min(i+8,paths.length)}/${paths.length}`);
}
sources['DOOM-EXE-BUILD.txt'] = strToU8(`Unmodified engine build sources from wasmdoom ${ENGINE_REV} (v0.0.2). Install Zig 0.16.0; run: zig build -Doptimize=ReleaseSmall. Output: zig-out/bin/wasmdoom.wasm. No WAD assets are required to build. Upstream GPL-2.0 license is in LICENSE.\n`);
await writeFile('web/public/source/wasmdoom-v0.0.2-source.zip',zipSync(sources));
await writeFile('web/public/licenses/wasmdoom-GPL-2.0.txt',sources.LICENSE);
await writeFile('LICENSE',sources.LICENSE);
await writeFile('game/provenance.json',JSON.stringify({engine:{version:'v0.0.2',revision:ENGINE_REV,sha256:ENGINE_SHA},freedoom:{version:'0.13.0',archiveSha256:digest},wad:{sha256:sha(wad),description:'Original EXECUTION survival arena: 24 enemies, shotgun/chaingun, ammo, medikits and armor; Freedoom 0.13.0 resources only'}},null,2));
console.log(`Prepared engine ${wasm.length} bytes and custom Freedoom IWAD ${wad.length} bytes.`);

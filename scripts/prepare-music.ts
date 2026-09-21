import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url='https://github.com/theMagicalKarp/wasmdoom/releases/download/v0.0.2/wasmdoom.music.wasm';
const r=await fetch(url);if(!r.ok)throw new Error('Music synth download failed');
const b=Buffer.from(await r.arrayBuffer());
if(createHash('sha256').update(b).digest('hex')!=='09f1c044366c65fb3981906854951b5efb076018274d7589fe4edbf6d67de338')throw new Error('Music synth checksum mismatch');
await mkdir('web/public/audio',{recursive:true});await writeFile('web/public/audio/wasmdoom.music.wasm',b);
console.log('Verified music synthesizer:',b.length,'bytes; source included in engine source archive.');


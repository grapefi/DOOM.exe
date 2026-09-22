import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {zipSync} from 'fflate';
const files:Record<string,Uint8Array>={};
async function collect(dir:string){for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory())await collect(path);else if(/\.(ts|tsx|css|sol|sql|json)$/.test(e.name))files[path.replaceAll('\\','/')]=await readFile(path);}}
for(const dir of ['contracts','scripts','shared','tests','web/src','server','db','drizzle'])await collect(dir);
for(const path of ['README.md','VALIDATION.md','THIRD_PARTY_NOTICES.md','LICENSE','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','vite.config.ts','vitest.config.ts','drizzle.config.ts','.env.example','.gitignore','web/index.html','web/public/favicon.svg','web/public/audio/music-worklet.js','web/public/arena-preview.png','web/public/fonts/PressStart2P-Regular.ttf','web/public/fonts/OFL.txt'])files[path]=await readFile(path);
await mkdir('web/public/source',{recursive:true});await writeFile('web/public/source/doom-exe-source.zip',zipSync(files));
console.log('Application source archive refreshed (no secrets, builds, dependencies or game binaries).');

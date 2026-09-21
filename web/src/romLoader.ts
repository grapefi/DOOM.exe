import {createPublicClient,http,isAddress,type Hex} from 'viem';
import {chain} from '../../shared/chain';
import {fetchOnchain} from '../../shared/onchain';
import {checkHash,decompressVerified,validateMeta,type RomMeta,MAX_COMPRESSED} from '../../shared/rom';
export const trimmedPreview=new URLSearchParams(window.location.search).get('preview')==='trimmed';
const localBase=trimmedPreview?'/rom-trimmed':'/rom';
export const manifestAddress=import.meta.env.VITE_MANIFEST_ADDRESS||'';
const rpc=import.meta.env.VITE_RPC_URL||chain.rpcUrls.default.http[0];
export type Progress={label:string;percent:number};
async function readBounded(response:Response,limit:number,signal:AbortSignal){
 if(!response.ok||!response.body) throw new Error('ROM files unavailable. Run pnpm assets and pnpm bundle.');
 const reader=response.body.getReader();const parts:Uint8Array[]=[];let length=0;
 try{while(true){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit)throw new Error('ROM download exceeds size limit');parts.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(length);let p=0;for(const part of parts){bytes.set(part,p);p+=part.length;}return bytes;
}
export async function loadRom(source:'local'|'chain',report:(p:Progress)=>void,signal:AbortSignal){
 report({label:source==='chain'?'Reading testnet manifest':'Reading local cartridge',percent:3});
 let bytes:Uint8Array,meta:RomMeta;
 if(source==='chain'){
  if(!isAddress(manifestAddress))throw new Error('No valid testnet manifest configured.');
  const client=createPublicClient({chain,transport:http(rpc,{timeout:20_000,retryCount:2})});
  const result=await fetchOnchain(client,manifestAddress,(n,total)=>report({label:`Reading chunk ${n} / ${total}`,percent:5+Math.round(n/total*75)}),signal);
  bytes=result.bytes;meta=result.meta;
 }else{
  const response=await fetch(localBase+'/manifest.json',{signal});
  const m=JSON.parse(new TextDecoder().decode(await readBounded(response,4096,signal)));validateMeta(m);meta=m;
  bytes=await readBounded(await fetch(localBase+'/rom.bin',{signal}),Math.min(meta.compressedSize,MAX_COMPRESSED),signal);
 }
 const pin=import.meta.env.VITE_ROM_HASH as Hex|undefined;
 if(source==='chain'&&pin&&pin.toLowerCase()!==meta.compressedHash.toLowerCase())throw new Error('Manifest does not match the published ROM hash');
 signal.throwIfAborted();report({label:'Verifying and decompressing cartridge',percent:85});
 checkHash(bytes,meta.compressedHash,meta.compressedSize);
 const files=await decompressVerified(bytes,meta);signal.throwIfAborted();
 report({label:'ROM verified · starting engine',percent:100});
 return {...files,meta};
}

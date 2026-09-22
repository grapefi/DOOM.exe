import { type PublicClient,type Address,type Chain,hexToBytes } from 'viem';
import { chain,manifestAbi } from './chain.ts';
import { CHUNK_BYTES, validateMeta,checkHash,type RomMeta } from './rom.ts';
export async function fetchOnchain(client:PublicClient,address:Address,progress:(done:number,total:number)=>void=()=>{},signal?:AbortSignal,expectedChain:Chain=chain) {
  signal?.throwIfAborted();
  if(await client.getChainId()!==expectedChain.id) throw new Error(`RPC is not ${expectedChain.name} (${expectedChain.id})`);
  const blockNumber=await client.getBlockNumber({cacheTime:0});
  const read=(functionName:'VERSION'|'compressedHash'|'rawHash'|'compressedSize'|'rawSize'|'chunkCount')=>client.readContract({address,abi:manifestAbi,functionName,blockNumber});
  const [version,compressedHash,rawHash,compressedSize,rawSize,count]=await Promise.all(['VERSION','compressedHash','rawHash','compressedSize','rawSize','chunkCount'].map(n=>read(n as Parameters<typeof read>[0])));
  const meta={version:Number(version),compressedHash,rawHash,compressedSize:Number(compressedSize),rawSize:Number(rawSize)};
  validateMeta(meta);
  const total=Number(count);
  if(total!==Math.ceil(meta.compressedSize/CHUNK_BYTES)) throw new Error('Manifest chunk count mismatch');
  const bytes=new Uint8Array(meta.compressedSize);let done=0;
  for(let first=0;first<total;first+=4) {
    signal?.throwIfAborted();
    await Promise.all(Array.from({length:Math.min(4,total-first)},async(_,j)=>{
      const i=first+j;
      const chunk=await client.readContract({address,abi:manifestAbi,functionName:'chunks',args:[BigInt(i)],blockNumber});
      const code=await client.getCode({address:chunk,blockNumber});
      const expected=Math.min(CHUNK_BYTES,bytes.length-i*CHUNK_BYTES);
      if(!code||code.length!==2+(expected+1)*2||!code.startsWith('0x00')) throw new Error(`Missing or invalid chunk ${i}`);
      bytes.set(hexToBytes(code).subarray(1),i*CHUNK_BYTES);progress(++done,total);
    }));
  }
  signal?.throwIfAborted();checkHash(bytes,meta.compressedHash,meta.compressedSize);
  return {bytes,meta:meta as RomMeta,blockNumber};
}

import {createPublicClient,http,isAddress,type Hex} from 'viem';
import {arbitrumChain,chain} from '../../shared/chain';
import {fetchOnchain} from '../../shared/onchain';
import {checkHash,decompressVerified,type RomMeta} from '../../shared/rom';
export const manifestAddress=import.meta.env.VITE_MANIFEST_ADDRESS||'';
export const arbitrumManifestAddress='0x9263dcd41931a92055188d9a5f8689eac0c4f03b';
const arbitrumHash='0x56b8aab9eeecb7a2b78e3532e442f038eb0c4806fe519bd6a05b47135633aabf';
const rpc=import.meta.env.VITE_RPC_URL||chain.rpcUrls.default.http[0];
export type Progress={label:string;percent:number};
export type CartridgeSource='robinhood'|'arbitrum';
export async function loadRom(source:CartridgeSource,report:(p:Progress)=>void,signal:AbortSignal){
 const activeChain=source==='arbitrum'?arbitrumChain:chain;
 const address=source==='arbitrum'?arbitrumManifestAddress:manifestAddress;
 const activeRpc=source==='arbitrum'?arbitrumChain.rpcUrls.default.http[0]:rpc;
 report({label:`Loading from chain`,percent:3});
 if(!isAddress(address))throw new Error('Robinhood mainnet cartridge is not deployed yet.');
 const client=createPublicClient({chain:activeChain,transport:http(activeRpc,{timeout:20_000,retryCount:2})});
 const result=await fetchOnchain(client,address,(n,total)=>report({label:`Loading from chain ${n} / ${total} chunks`,percent:5+Math.round(n/total*75)}),signal,activeChain);
 const bytes=result.bytes,meta:RomMeta=result.meta;
 const pin=(source==='arbitrum'?arbitrumHash:import.meta.env.VITE_ROM_HASH) as Hex|undefined;
 if(pin&&pin.toLowerCase()!==meta.compressedHash.toLowerCase())throw new Error('Manifest does not match the published ROM hash');
 signal.throwIfAborted();report({label:'Verifying and decompressing cartridge',percent:85});
 checkHash(bytes,meta.compressedHash,meta.compressedSize);
 const files=await decompressVerified(bytes,meta);signal.throwIfAborted();
 report({label:'ROM verified · starting engine',percent:100});
 return {...files,meta};
}

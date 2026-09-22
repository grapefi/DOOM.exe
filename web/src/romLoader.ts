import {createPublicClient,http,isAddress,type Hex} from 'viem';
import {chain} from '../../shared/chain';
import {fetchOnchain} from '../../shared/onchain';
import {checkHash,decompressVerified,type RomMeta} from '../../shared/rom';
export const manifestAddress=import.meta.env.VITE_MANIFEST_ADDRESS||'';
const rpc=import.meta.env.VITE_RPC_URL||chain.rpcUrls.default.http[0];
export type Progress={label:string;percent:number};
export async function loadRom(report:(p:Progress)=>void,signal:AbortSignal){
 report({label:'Reading Robinhood Chain manifest',percent:3});
 if(!isAddress(manifestAddress))throw new Error('Robinhood mainnet cartridge is not deployed yet.');
 const client=createPublicClient({chain,transport:http(rpc,{timeout:20_000,retryCount:2})});
 const result=await fetchOnchain(client,manifestAddress,(n,total)=>report({label:`Reading chunk ${n} / ${total}`,percent:5+Math.round(n/total*75)}),signal);
 const bytes=result.bytes,meta:RomMeta=result.meta;
 const pin=import.meta.env.VITE_ROM_HASH as Hex|undefined;
 if(pin&&pin.toLowerCase()!==meta.compressedHash.toLowerCase())throw new Error('Manifest does not match the published ROM hash');
 signal.throwIfAborted();report({label:'Verifying and decompressing cartridge',percent:85});
 checkHash(bytes,meta.compressedHash,meta.compressedSize);
 const files=await decompressVerified(bytes,meta);signal.throwIfAborted();
 report({label:'ROM verified · starting engine',percent:100});
 return {...files,meta};
}

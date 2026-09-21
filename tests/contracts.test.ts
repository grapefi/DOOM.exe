import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import ganache from 'ganache';
import {createPublicClient,createWalletClient,custom,bytesToHex,keccak256,concatHex,encodeDeployData,type Address} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {chain,manifestAbi} from '../shared/chain';
import {CHUNK_BYTES,split} from '../shared/rom';
import {fetchOnchain} from '../shared/onchain';
import {compile} from '../scripts/compile';
const key=('0x'+'11'.repeat(32)) as `0x${string}`;
const account=privateKeyToAccount(key);
const provider=ganache.provider({chain:{chainId:421614,hardfork:'shanghai'},wallet:{accounts:[{secretKey:key,balance:'0x3635c9adc5dea00000'}]},logging:{quiet:true}});
const transport=custom(provider as any,{retryCount:0});
const client=createPublicClient({chain,transport}),wallet=createWalletClient({chain,transport,account});
let artifacts:Awaited<ReturnType<typeof compile>>;
beforeAll(async()=>{artifacts=await compile();},30_000);
afterAll(async()=>{await provider.disconnect();});
async function deploy(name:string,args:unknown[]){const hash=await wallet.deployContract({...artifacts[name],args});const r=await client.waitForTransactionReceipt({hash});if(r.status!=='success'||!r.contractAddress)throw new Error('deployment reverted');return r.contractAddress;}
describe('immutable bytecode storage',()=>{
 it('stores exactly STOP + maximum payload and ignores calls',async()=>{const payload=new Uint8Array(CHUNK_BYTES).fill(0xef);const address=await deploy('DataChunk',[bytesToHex(payload)]);expect(await client.getCode({address})).toBe(concatHex(['0x00',bytesToHex(payload)]));expect((await client.call({to:address,data:'0x12345678'})).data).toBeUndefined();});
 it('keeps a 271-chunk manifest within a practical gas envelope',async()=>{
  const chunk=await deploy('DataChunk',[bytesToHex(new Uint8Array(CHUNK_BYTES).fill(1))]);
  const hash=keccak256(new Uint8Array([1]));
  const data=encodeDeployData({...artifacts.RomManifest,args:[Array(271).fill(chunk),hash,hash,BigInt(271*CHUNK_BYTES),64_000_000n]});
  const gas=await client.estimateGas({account:account.address,data});
  expect(gas).toBeLessThan(8_000_000n);
 },30_000);
 it('rejects zero or oversize chunks',async()=>{await expect(deploy('DataChunk',['0x'])).rejects.toThrow();await expect(deploy('DataChunk',[bytesToHex(new Uint8Array(CHUNK_BYTES+1))])).rejects.toThrow();});
 it('reconstructs ordered chunks through the production viem loader',async()=>{const data=new Uint8Array(CHUNK_BYTES+7).map((_,i)=>i%251),hash=keccak256(data);const addresses:Address[]=[];for(const part of split(data))addresses.push(await deploy('DataChunk',[bytesToHex(part)]));const manifest=await deploy('RomManifest',[addresses,hash,hash,BigInt(data.length),100n]);const loaded=await fetchOnchain(client,manifest);expect(loaded.bytes).toEqual(data);expect(loaded.meta.compressedHash).toEqual(hash);expect(await client.readContract({address:manifest,abi:manifestAbi,functionName:'VERSION'})).toBe(1n);});
 it('rejects noncontracts, wrong totals, empty manifests and short interior chunks',async()=>{const hash=keccak256(new Uint8Array([1]));const small=await deploy('DataChunk',['0x1234']);for(const args of [[[],hash,hash,1n,20n],[[account.address],hash,hash,2n,20n],[[small],hash,hash,3n,20n],[[small,small],hash,hash,4n,20n],[[small],hash,hash,2n,100_000_000n]])await expect(deploy('RomManifest',args)).rejects.toThrow();});
 it('loader rejects committed hash mismatch',async()=>{const chunk=await deploy('DataChunk',['0x1234']);const hash=keccak256(new Uint8Array([1]));const manifest=await deploy('RomManifest',[[chunk],hash,hash,2n,20n]);await expect(fetchOnchain(client,manifest)).rejects.toThrow('integrity');});
 it('loader refuses a different chain',async()=>{await expect(fetchOnchain({...client,getChainId:async()=>1} as typeof client,account.address)).rejects.toThrow('421614');});
});

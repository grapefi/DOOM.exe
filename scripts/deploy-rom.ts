import './env.ts';
import { readFile,mkdir,writeFile,rename } from 'node:fs/promises';
import { createPublicClient,createWalletClient,http,bytesToHex,concatHex,encodeDeployData,formatEther,parseEther,type Address,type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { chain } from '../shared/chain.ts';
import { split,validateMeta,checkHash,decompressVerified } from '../shared/rom.ts';
import { compile } from './compile.ts';
const romDir=process.env.ROM_DIR||'web/public/rom-trimmed';
const meta=JSON.parse(await readFile(`${romDir}/manifest.json`,'utf8'));validateMeta(meta);
const bytes=new Uint8Array(await readFile(`${romDir}/rom.bin`));checkHash(bytes,meta.compressedHash,meta.compressedSize);await decompressVerified(bytes,meta);
const chunks=split(bytes),artifacts=await compile();
console.log(`ROM ${meta.compressedHash}\n${chunks.length} chunks, ${bytes.length} compressed bytes.\nCode-deposit lower bound: ${200*(bytes.length+chunks.length)} gas (excludes transaction, manifest and L1 fees).`);
if(!process.argv.includes('--broadcast')) { console.log('Plan only. Set PRIVATE_KEY and MAX_DEPLOYMENT_ETH in .env, then run pnpm run deploy --broadcast.'); process.exit(0); }
if(!/^0x[0-9a-fA-F]{64}$/.test(process.env.PRIVATE_KEY??'')) throw new Error('Set a dedicated Robinhood mainnet PRIVATE_KEY in .env');
if(!process.env.MAX_DEPLOYMENT_ETH) throw new Error('Set MAX_DEPLOYMENT_ETH as the cumulative transaction fee cap');
const budget=parseEther(process.env.MAX_DEPLOYMENT_ETH);
if(budget<=0n) throw new Error('Budget must be positive');
const account=privateKeyToAccount(process.env.PRIVATE_KEY as Hex),transport=http(process.env.RPC_URL||chain.rpcUrls.default.http[0],{timeout:30_000,retryCount:3});
const client=createPublicClient({chain,transport}),wallet=createWalletClient({chain,transport,account});
if(await client.getChainId()!==chain.id) throw new Error(`Refusing to deploy outside Robinhood mainnet (${chain.id})`);
await mkdir('deployments',{recursive:true});
const path=`deployments/${chain.id}-${meta.compressedHash}.json`;
type Journal={chainId:number;deployer:Address;hash:Hex;chunks:Address[];transactions:Hex[];pending?:Hex;manifest?:Address};
let journal:Journal;
try { journal=JSON.parse(await readFile(path,'utf8')); } catch(e) { if((e as NodeJS.ErrnoException).code!=='ENOENT') throw e; journal={chainId:chain.id,deployer:account.address,hash:meta.compressedHash,chunks:[],transactions:[]}; }
if(journal.chainId!==chain.id||journal.deployer!==account.address||journal.hash!==meta.compressedHash||journal.chunks.length>chunks.length) throw new Error('Checkpoint does not match this deployer/ROM');
async function save(){ await writeFile(path+'.tmp',JSON.stringify(journal,null,2));await rename(path+'.tmp',path); }
let spent=0n;
for(const hash of journal.transactions) { const r=await client.getTransactionReceipt({hash});spent+=r.gasUsed*r.effectiveGasPrice; }
async function finish(hash:Hex) {
 const receipt=await client.waitForTransactionReceipt({hash,confirmations:2,timeout:180_000});
 if(!journal.transactions.includes(hash)) {journal.transactions.push(hash);spent+=receipt.gasUsed*receipt.effectiveGasPrice;}
 delete journal.pending;
 if(receipt.status!=='success'||!receipt.contractAddress) {await save();throw new Error(`Deployment reverted: ${hash}`);}
 if(journal.chunks.length<chunks.length) journal.chunks.push(receipt.contractAddress); else journal.manifest=receipt.contractAddress;
 await save();
}
if(journal.pending) await finish(journal.pending);
for(let i=0;i<journal.chunks.length;i++) {
 const code=await client.getCode({address:journal.chunks[i]});
 if(code?.toLowerCase()!==concatHex(['0x00',bytesToHex(chunks[i])]).toLowerCase()) throw new Error(`Checkpoint chunk ${i} has wrong code`);
}
async function deploy(name:string,args:unknown[]) {
 const artifact=artifacts[name],data=encodeDeployData({...artifact,args});
 const estimate=await client.estimateGas({account:account.address,data});
 const gas=estimate*120n/100n,gasPrice=(await client.getGasPrice())*120n/100n;
 const ceiling=gas*gasPrice;
 if(spent+ceiling>budget) throw new Error(`Fee cap reached; spent ${formatEther(spent)} ETH. Resume after reviewing MAX_DEPLOYMENT_ETH.`);
 if(await client.getBalance({address:account.address})<ceiling) throw new Error('Insufficient ETH on Robinhood Chain');
 console.log(`${name}: max transaction fee ${formatEther(ceiling)} ETH; spent ${formatEther(spent)} ETH`);
 journal.pending=await wallet.sendTransaction({data,gas,gasPrice});
 await save();await finish(journal.pending!);
}
for(let i=journal.chunks.length;i<chunks.length;i++) {console.log(`Chunk ${i+1}/${chunks.length}`);await deploy('DataChunk',[bytesToHex(chunks[i])]);}
if(!journal.manifest) await deploy('RomManifest',[journal.chunks,meta.compressedHash,meta.rawHash,BigInt(meta.compressedSize),BigInt(meta.rawSize)]);
console.log(`Manifest: ${journal.manifest}\nSpent: ${formatEther(spent)} ETH\nRun pnpm run verify ${journal.manifest}\nVITE_MANIFEST_ADDRESS=${journal.manifest}\nVITE_ROM_HASH=${meta.compressedHash}`);

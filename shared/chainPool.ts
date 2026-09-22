import {MSFT_TOKEN,PRIZE_WALLET,type PoolData} from './prizePool';

// Chainlink's Robinhood MSFT/USD proxy. The feed already includes the share multiplier.
// https://docs.chain.link/data-feeds/tokenized-equity-feeds/robinhood
export const MSFT_FEED='0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E';
export const CHAIN_RPC='https://rpc.mainnet.chain.robinhood.com';
const call=(id:number,to:string,data:string)=>({jsonrpc:'2.0',id,method:'eth_call',params:[{to,data},'latest']});
export function decodeChainPool(rows:any,now=Date.now()):PoolData{
 if(!Array.isArray(rows))throw new Error('Prize wallet response unavailable.');
 const result=(id:number)=>{const r=rows.find((x:any)=>x.id===id);if(!r||r.error)throw new Error('Prize wallet response unavailable.');return r.result;};
 const word=(id:number)=>{const s=result(id);if(typeof s!=='string'||!/^0x[0-9a-f]{1,64}$/i.test(s))throw new Error('Invalid chain response.');return BigInt(s);};
 if(word(1)!==4663n)throw new Error('Unexpected prize wallet network.');
 const block=result(7),blockTime=Number(BigInt(block?.timestamp))*1000;
 if(!Number.isFinite(blockTime)||now-blockTime>120000||blockTime>now+60000)throw new Error('Waiting for a fresh chain update.');
 const raw=word(2),decimals=Number(word(3));
 if(decimals!==18)throw new Error('Unexpected MSFT token decimals.');
 const fraction=(raw%10n**18n).toString().padStart(18,'0').replace(/0+$/,'');
 const tokens=String(raw/10n**18n)+(fraction?'.'+fraction:'');
 const data:PoolData={tokens,usdValue:raw===0n?'0.00':null,checkedAt:new Date(now).toISOString(),quoteAt:null,priceAvailable:false,priceSource:'chainlink'};
 try{
  if(word(6)!==0n)throw new Error('Oracle paused');
  const encoded=result(4);
  if(typeof encoded!=='string'||!/^0x[0-9a-f]{320}$/i.test(encoded))throw new Error('Invalid price response');
  const [round,answer,,updated,answered]=encoded.slice(2).match(/.{64}/g)!.map((s:string)=>BigInt('0x'+s));
  const priceDecimals=Number(word(5)),age=now-Number(updated)*1000;
  if(answer<=0n||answer>=2n**255n||round===0n||answered<round||updated===0n||age< -60000||age>86700000||priceDecimals!==8)throw new Error('Price unavailable or stale');
  const denominator=10n**BigInt(decimals+priceDecimals),cents=(raw*answer*100n+denominator/2n)/denominator;
  data.usdValue=`${cents/100n}.${(cents%100n).toString().padStart(2,'0')}`;
  data.quoteAt=new Date(Number(updated)*1000).toISOString();data.priceAvailable=true;
 }catch{/* Keep a verified token balance visible when the quote is unavailable. */}
 return data;
}
export async function getChainPool(signal?:AbortSignal):Promise<PoolData>{
 const response=await fetch(CHAIN_RPC,{method:'POST',headers:{'Content-Type':'application/json'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000),body:JSON.stringify([
  {jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]},
  call(2,MSFT_TOKEN,'0x70a08231'+PRIZE_WALLET.slice(2).toLowerCase().padStart(64,'0')),
  call(3,MSFT_TOKEN,'0x313ce567'),call(4,MSFT_FEED,'0xfeaf968c'),call(5,MSFT_FEED,'0x313ce567'),call(6,MSFT_TOKEN,'0x7706ba52'),
  {jsonrpc:'2.0',id:7,method:'eth_getBlockByNumber',params:['latest',false]},
 ])});
 if(!response.ok)throw new Error('Prize wallet temporarily unavailable.');
 return decodeChainPool(await response.json());
}

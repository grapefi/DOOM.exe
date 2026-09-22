import {PRIZE_WALLET,MSFT_TOKEN,type PoolData} from '../shared/prizePool';
const SCALE=10n**18n;
let cached:{until:number;data:PoolData}|undefined;
async function request(url:string,init?:RequestInit){
 const response=await fetch(url,{...init,signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('Prize pool source unavailable');
 return response.json() as Promise<any>;
}
export function fixed(value:string){
 if(!/^\d+(\.\d{1,18})?$/.test(value))throw new Error('Invalid price');
 const [whole,fraction='']=value.split('.');return BigInt(whole)*SCALE+BigInt(fraction.padEnd(18,'0'));
}
export function decimal(value:bigint,places:number){
 const scale=10n**BigInt(places),fraction=(value%scale).toString().padStart(places,'0').replace(/0+$/,'');
 return (value/scale).toString()+(fraction?'.'+fraction:'');
}
export function valueInUsd(balance:bigint,decimals:number,bid:string,ask:string,multiplier:string){
 const b=fixed(bid),a=fixed(ask),m=fixed(multiplier);
 if(b<=0n||a<b||m<=0n)throw new Error('Invalid quote');
 const numerator=balance*(a+b)*m*100n,denominator=2n*(10n**BigInt(decimals))*SCALE*SCALE;
 const cents=(numerator+denominator/2n)/denominator;
 return `${cents/100n}.${(cents%100n).toString().padStart(2,'0')}`;
}
export async function getPrizePool():Promise<PoolData>{
 if(cached&&cached.until>Date.now())return cached.data;
 const [rpc,assets,prices]=await Promise.allSettled([
  request('https://rpc.mainnet.chain.robinhood.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify([
   {jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]},
   {jsonrpc:'2.0',id:2,method:'eth_call',params:[{to:MSFT_TOKEN,data:'0x70a08231'+PRIZE_WALLET.slice(2).toLowerCase().padStart(64,'0')},'latest']},
   {jsonrpc:'2.0',id:3,method:'eth_call',params:[{to:MSFT_TOKEN,data:'0x313ce567'},'latest']},
  ])}),
  request('https://api.robinhood.com/rhj/assets'),
  request('https://api.robinhood.com/rhj/prices/MSFT'),
 ]);
 if(rpc.status!=='fulfilled'||!Array.isArray(rpc.value))throw new Error('Prize pool balance unavailable');
 const result=(id:number)=>{const r=rpc.value.find((r:any)=>r.id===id);if(r?.error||!/^0x[0-9a-f]+$/i.test(r?.result??''))throw new Error('Invalid balance response');return BigInt(r.result);};
 if(result(1)!==4663n)throw new Error('Unexpected prize pool network');
 const raw=result(2),decimals=Number(result(3));if(decimals<0||decimals>36)throw new Error('Invalid token decimals');
 let usdValue:string|null=raw===0n?'0.00':null,quoteAt:string|null=null,priceAvailable=false;
 try{
  if(assets.status!=='fulfilled'||prices.status!=='fulfilled')throw new Error('Price unavailable');
  const matches=(x:any)=>x.tokenSymbol==='MSFT'&&x.deployments?.some((d:any)=>d.chainId===4663&&d.contractAddress?.toLowerCase()===MSFT_TOKEN.toLowerCase());
  const asset=assets.value.assets?.find(matches),quote=prices.value.quotes?.find(matches);
  const time=Date.parse(quote?.generatedAt),age=Date.now()-time;
  if(!asset||asset.status!=='ASSET_STATUS_ACTIVE'||!quote||quote.currency!=='USD'||quote.isTradingHalt||!Number.isFinite(age)||age< -60000||age>15*60000)throw new Error('Price unavailable or stale');
  usdValue=valueInUsd(raw,decimals,quote.bid,quote.ask,asset.currentMultiplier);quoteAt=new Date(time).toISOString();priceAvailable=true;
 }catch(error){console.warn('MSFT valuation unavailable',error);}
 const data={tokens:decimal(raw,decimals),usdValue,checkedAt:new Date().toISOString(),quoteAt,priceAvailable};
 cached={until:Date.now()+30000,data};return data;
}

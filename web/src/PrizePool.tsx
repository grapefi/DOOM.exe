import {useEffect,useState} from 'react';
import {PRIZE_WALLET,PRIZE_EXPLORER,MSFT_TOKEN,type PoolData} from '../../shared/prizePool';
import {scoreApi} from './leaderboard';
import {getChainPool} from '../../shared/chainPool';
export function PrizePool(){
 const [data,setData]=useState<PoolData>(),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let busy=false;
  async function load(){if(busy)return;busy=true;try{let next:PoolData;try{next=await getChainPool(controller.signal);}catch(e){if(controller.signal.aborted)throw e;next=await scoreApi<PoolData>('/api/prize-pool',undefined,controller.signal);}if(!controller.signal.aborted){setData(next);setError('');}}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Prize pool unavailable.');}finally{busy=false;}}
  void load();const interval=setInterval(()=>{if(!document.hidden)void load();},60000);
  return()=>{controller.abort();clearInterval(interval);};
 },[retry]);
 const tokens=data?(Number(data.tokens)>0&&Number(data.tokens)<0.000001?'<0.000001':new Intl.NumberFormat('en-US',{maximumFractionDigits:6}).format(Number(data.tokens))):error?'UNAVAILABLE':'LOADING…';
 const usd=data?.usdValue!==null&&data?.usdValue!==undefined?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(data.usdValue)):data?'PRICE UNAVAILABLE':error?'UNAVAILABLE':'LOADING…';
 return <section className="prize-pool" aria-labelledby="prize-pool-title">
  <div><p className="eyebrow">TRADING FEES → PLAYER PRIZES</p><h2 id="prize-pool-title">PRIZE POOL</h2><p>Funded by token trading fees.<br/>Held in MSFT stock tokens on Robinhood Chain.</p></div>
  <div className="prize-amounts"><div><span>MSFT STOCK TOKENS</span><strong title={data?.tokens}>{tokens}</strong></div><div><span>ESTIMATED USD VALUE</span><strong>{usd}</strong></div></div>
  <div className="prize-status"><div>{error?<span role="alert">{data?'Showing the last confirmed balance. ':''}{error} <button onClick={()=>setRetry(x=>x+1)}>RETRY</button></span>:data?<span>Balance checked {new Date(data.checkedAt).toLocaleTimeString()} · updates every minute{data.tokens==='0'?' · awaiting funding':''}</span>:<span role="status">Checking the prize wallet…</span>}</div>
   <div className="prize-links"><a href={`${PRIZE_EXPLORER}/address/${PRIZE_WALLET}`} target="_blank" rel="noopener noreferrer">PRIZE WALLET {PRIZE_WALLET.slice(0,6)}…{PRIZE_WALLET.slice(-4)} ↗</a><a href={`${PRIZE_EXPLORER}/token/${MSFT_TOKEN}`} target="_blank" rel="noopener noreferrer">MSFT TOKEN ↗</a></div>
   {data?.quoteAt&&<small>{data.priceSource==='chainlink'?'USD estimate uses Chainlink’s MSFT token price, including the share multiplier.':'USD estimate uses Robinhood’s bid/ask midpoint and share multiplier.'} Quote: {new Date(data.quoteAt).toLocaleString()}.</small>}
  </div>
 </section>;
}

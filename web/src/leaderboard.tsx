import {useEffect,useState} from 'react';
import {formatTime} from '../../shared/round';
import {ShareRound} from './share';
export async function scoreApi<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>({error:'Leaderboard unavailable. Please try again.'}));
 if(!response.ok)throw new Error(data.error||'Could not save your time. Please try again.');
 return data as T;
}
type Entry={name:string;elapsedMs:number;finishedAt:number};
const medals=[{tone:'gold',label:'Gold DOOM medal',share:'70%'},{tone:'silver',label:'Silver DOOM medal',share:'20%'},{tone:'bronze',label:'Bronze DOOM medal',share:'10%'}] as const;
export function Leaderboard({revision}:{revision:number}){
 const [entries,setEntries]=useState<Entry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let busy=false;
  async function load(){if(busy)return;busy=true;try{const result=await scoreApi<{entries:Entry[]}>('/api/leaderboard',undefined,controller.signal);if(!controller.signal.aborted){setEntries(result.entries);setError('');}}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Could not load rankings.');}finally{busy=false;if(!controller.signal.aborted)setLoading(false);}}
  void load();const timer=setInterval(()=>{if(!document.hidden)void load();},30000);
  return()=>{controller.abort();clearInterval(timer);};
 },[revision,retry]);
 return <section className="leaderboard" id="leaderboard" aria-labelledby="leaderboard-title">
  <div className="leaderboard-heading"><div><p className="eyebrow">EXECUTION // COMPLETED RUNS</p><h2 id="leaderboard-title">FASTEST FINISHES</h2></div><div className="leaderboard-actions"><ShareRound/><button onClick={()=>setRetry(x=>x+1)}>REFRESH</button></div></div>
  <div className="daily-pot" aria-label="Daily prize distribution"><div><strong>DAILY TRADING FEE POT</strong><span>Awarded every day at 00:00 UTC</span></div><ol>{medals.map((medal,i)=><li key={medal.tone}><span className={`doom-medal ${medal.tone}`} aria-hidden="true"><img src="/doom-exe-icon.png" alt=""/></span><b>{i+1}{i===0?'ST':i===1?'ND':'RD'}</b><strong>{medal.share}</strong></li>)}</ol></div>
  <p className="ranking-note">Reach the exit, enter your name, and post your time. The three fastest finishers share the daily pot: 1st wins 70%, 2nd wins 20%, and 3rd wins 10%.</p>
  {loading?<p role="status">Loading rankings…</p>:error?<div className="ranking-error" role="alert">{error} <button onClick={()=>setRetry(x=>x+1)}>TRY AGAIN</button></div>:entries.length===0?<div className="ranking-empty">NO FINISHERS YET.<span>Be the first to make it out.</span></div>:<div className="ranking-scroll"><table><thead><tr><th scope="col">RANK</th><th scope="col">PLAYER</th><th scope="col">ROUND TIME</th><th scope="col"><span className="sr-only">Share round</span></th></tr></thead><tbody>{entries.map((entry,i)=>{const medal=medals[i];return <tr className={medal?'podium-row':''} key={`${entry.finishedAt}-${i}`}><td><span className="rank-number">{String(i+1).padStart(2,'0')}</span>{medal&&<span className={`doom-medal ${medal.tone}`} title={medal.label}><img src="/doom-exe-icon.png" alt=""/><span className="sr-only">{medal.label}</span></span>}</td><td>{entry.name}</td><td className="round-time"><time>{formatTime(entry.elapsedMs)}</time></td><td><ShareRound elapsedMs={entry.elapsedMs} name={entry.name} compact/></td></tr>})}</tbody></table></div>}
 </section>;
}

import {chain} from '../../shared/chain';
import {useEffect,useRef,useState} from 'react';
import {arbitrumManifestAddress,loadRom,manifestAddress,type CartridgeSource,type Progress} from './romLoader';
import {startPlayer} from './doomPlayer';
import {formatTime,type Outcome} from '../../shared/round';
import {Leaderboard,scoreApi} from './leaderboard';
import {ShareRound} from './share';
import {PrizePool} from './PrizePool';
import {OnChain} from './OnChain';
import type {RomMeta} from '../../shared/rom';
export default function App(){
 const [source,setSource]=useState<CartridgeSource>(manifestAddress?'robinhood':'arbitrum');
 const [phase,setPhase]=useState<'ready'|'loading'|'playing'|'complete'|'dead'|'error'>('ready');
 const [progress,setProgress]=useState<Progress>({label:'Cartridge ready',percent:0});
 const [error,setError]=useState(''),[meta,setMeta]=useState<RomMeta>();
 const [muted,setMuted]=useState(false);
 const [elapsed,setElapsed]=useState(0),[paused,setPaused]=useState(false),[name,setName]=useState(''),[scoreError,setScoreError]=useState(''),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[ranked,setRanked]=useState(true),[revision,setRevision]=useState(0);
 const result=useRef<{id:string;outcome:Outcome;elapsedMs:number}|null>(null);
 const viewport=useRef<HTMLDivElement>(null);
 const canvas=useRef<HTMLCanvasElement>(null),stop=useRef<(()=>void)|null>(null),abort=useRef<AbortController|null>(null),audio=useRef<AudioContext|null>(null);
 function closeAudio(){const a=audio.current;audio.current=null;if(a&&a.state!=='closed')void a.close().catch(()=>{});}
 useEffect(()=>{if(phase==='playing')canvas.current?.focus();},[phase]);
 useEffect(()=>()=>{abort.current?.abort();stop.current?.();closeAudio();},[]);
 async function launch(){
  abort.current?.abort();stop.current?.();stop.current=null;closeAudio();
  const controller=new AbortController();abort.current=controller;result.current=null;setError('');setMeta(undefined);setElapsed(0);setPaused(false);setScoreError('');setSaved(false);setSaving(false);setRanked(source==='robinhood');setPhase('loading');
  try{audio.current=new AudioContext();if(!muted)await audio.current.resume();else await audio.current.suspend();}catch{audio.current=null;}
  try{
   const rom=await loadRom(source,setProgress,controller.signal);controller.signal.throwIfAborted();setMeta(rom.meta);
   let roundId='';
   if(source==='robinhood')try{roundId=(await scoreApi<{id:string}>('/api/runs/start',{},controller.signal)).id;}catch{if(!controller.signal.aborted)setRanked(false);}
   controller.signal.throwIfAborted();
   const cleanup=await startPlayer(canvas.current!,rom.wasm,rom.wad,audio.current,(outcome,elapsedMs)=>{
    if(controller.signal.aborted)return;
    setElapsed(elapsedMs);setPaused(false);setPhase(outcome);
    const ended=roundId?{id:roundId,outcome,elapsedMs}:null;result.current=ended;
    if(ended)void scoreApi('/api/runs/finish',ended).catch(()=>{});
   },message=>{if(!controller.signal.aborted){setError(message);setPhase('error');}},(elapsedMs,isPaused)=>{if(!controller.signal.aborted){setElapsed(elapsedMs);setPaused(isPaused);}});
   if(controller.signal.aborted){cleanup();return;}stop.current=cleanup;setPhase('playing');canvas.current?.focus();
  }catch(e){if(controller.signal.aborted)return;setError(e instanceof Error?e.message:'Unable to launch cartridge');setPhase('error');closeAudio();}
 }
 function reset(){abort.current?.abort();stop.current?.();stop.current=null;closeAudio();result.current=null;setElapsed(0);setPaused(false);setScoreError('');setSaved(false);setSaving(false);setPhase('ready');setMeta(undefined);setProgress({label:'Cartridge ready',percent:0});}
 async function saveScore(event:React.FormEvent){
  event.preventDefault();const ended=result.current;if(!ended||ended.outcome!=='complete'||saving||saved)return;
  setSaving(true);setScoreError('');
  try{await scoreApi('/api/runs/finish',ended);await scoreApi('/api/leaderboard',{id:ended.id,name});if(result.current===ended){setSaved(true);setRevision(x=>x+1);}}
  catch(e){if(result.current===ended)setScoreError(e instanceof Error?e.message:'Unable to save time. Please try again.');}
  finally{if(result.current===ended)setSaving(false);}
 }
 useEffect(()=>{if(phase==='dead'||phase==='complete')viewport.current?.querySelector<HTMLButtonElement>('.play-again')?.focus();},[phase]);
 function toggleSound(){const next=!muted;setMuted(next);if(audio.current){void (next?audio.current.suspend():audio.current.resume()).catch(()=>{});}canvas.current?.focus();}
 return <main>
  <header className="site-hero">
   <img className="hero-image" src="/doom-exe-hell-header.png" alt="DOOM.EXE — Hell has a new home. Play on Robinhood Chain."/>
   <div className="brand-bar"><a className="brand" href="/" aria-label="DOOM.EXE home"><img className="header-wordmark" src="/doom-exe-wordmark.png" alt="DOOM.EXE"/></a><div className="network"><i/> ROBINHOOD CHAIN <b>MAINNET / {chain.id}</b></div><div className="header-actions"><a className="competition-link" href="#competition">PRIZE + LEADERBOARD ↓</a><a className="github-link" href="https://github.com/grapefi/DOOM.exe" target="_blank" rel="noreferrer">GITHUB ↗</a></div></div>
  </header>
  <section className="titlebar"><div><p className="eyebrow">EPISODE 01 // SURVIVAL</p><h1>EXECUTION<span>_</span></h1></div><p className="edition"><b>24 HOSTILES.</b><br/>ONE WAY OUT.</p></section>
  <section className="console">
   <div className="screen-column" ref={viewport}>
    <div className="screen-top"><span><i/> {source==='arbitrum'?'ARBITRUM PLAYTHROUGH CARTRIDGE':'ROBINHOOD CHAIN CARTRIDGE'}</span><span>320 × 200 / 35 HZ</span></div>
    <div className="round-clock" aria-label="Round timer"><span>ROUND TIME</span><time>{formatTime(elapsed)}</time><span>{phase==='playing'?(paused?'PAUSED':'IN PLAY'):phase==='complete'?'FINISHED':phase==='dead'?'ROUND OVER':'READY'}</span></div>
    <div className="viewport">
     <canvas ref={canvas} tabIndex={0} aria-label="Game viewport. WASD move, arrows turn, Space fire, Control use/exit." className={phase==='playing'||phase==='complete'||phase==='dead'?'visible':''}/>
     {(phase==='ready'||phase==='error')&&<div className="boot"><p className="eyebrow">// {source==='arbitrum'?'ARBITRUM PLAYTHROUGH':'ROBINHOOD MAINNET'} //</p><img className="game-brand" src="/doom-exe-wordmark.png" alt="DOOM.EXE"/><h2>ENTER THE<br/><em>EXECUTION ZONE</em></h2><p>Survive the crowd. Scavenge supplies. Reach the exit.</p><button className="primary" onClick={launch} disabled={source==='robinhood'&&!manifestAddress}>{source==='arbitrum'?'▶ PLAY ARBITRUM VERSION':manifestAddress?'▶ PLAY ON ROBINHOOD CHAIN':'ROBINHOOD CHAIN · DEPLOYING SOON'}</button><small>{source==='arbitrum'?'On-chain Arbitrum preview · available for recording · no wallet needed':manifestAddress?'On-chain cartridge · no wallet needed':'Select Arbitrum Playthrough to record the game now.'}</small></div>}
     {phase==='loading'&&<div className="boot loading"><img className="game-brand compact" src="/doom-exe-wordmark.png" alt="DOOM.EXE"/><p className="eyebrow">BOOT SEQUENCE</p><h2>LOADING<span className="blink">_</span></h2><progress value={progress.percent} max={100}/><p role="status">{progress.label}</p><button className="text-button" onClick={reset}>CANCEL</button></div>}
     {phase==='dead'&&<div className="finished death-screen" role="region" aria-label="You died"><img className="game-brand compact" src="/doom-exe-wordmark.png" alt="DOOM.EXE"/><p className="eyebrow">ROUND OVER</p><h2>YOU DIED.</h2><p>The arena claimed another.</p><p className="result-time">{formatTime(elapsed)}</p><button className="primary play-again" onClick={launch}>↻ PLAY AGAIN</button></div>}
     {phase==='complete'&&<div className="finished" role="region" aria-label="Round completed"><img className="game-brand compact" src="/doom-exe-wordmark.png" alt="DOOM.EXE"/><p className="eyebrow">EXIT REACHED</p><h2>EXECUTED.</h2><p className="result-time">{formatTime(elapsed)}</p>
      {ranked?(saved?<p className="score-success" role="status">TIME SAVED TO THE LEADERBOARD</p>:<form className="score-form" onSubmit={saveScore}><label htmlFor="player-name">YOUR NAME</label><div><input id="player-name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={20} required autoComplete="nickname" placeholder="Enter your name" disabled={saving}/><button type="submit" disabled={saving}>{saving?'SAVING…':'POST TIME'}</button></div><small>2–20 characters · your name will be public</small>{scoreError&&<p role="alert">{scoreError}</p>}</form>):<p className="ranking-note">Leaderboard was unavailable for this round. Play again to record a time.</p>}
      <div className="round-actions"><button className="primary play-again" onClick={launch} disabled={saving}>↻ PLAY AGAIN</button><ShareRound elapsedMs={elapsed}/></div></div>}
    </div>
    <div className="screen-bottom"><span className={meta?'verified':''}>{meta?'✓ ROM INTEGRITY VERIFIED':'> AWAITING EXECUTION'}</span><button onClick={()=>{void viewport.current?.requestFullscreen().catch(()=>{});}}>FULLSCREEN ↗</button></div>
   </div>
   <aside>
    <div className="panel-heading"><span>01</span> CARTRIDGE NETWORK</div>
    <div className="source-tabs" role="group" aria-label="Cartridge network"><button aria-pressed={source==='robinhood'} disabled={!manifestAddress||phase==='loading'||phase==='playing'} onClick={()=>{reset();setSource('robinhood');}}>ROBINHOOD</button><button aria-pressed={source==='arbitrum'} disabled={phase==='loading'||phase==='playing'} onClick={()=>{reset();setSource('arbitrum');}}>ARBITRUM PLAYTHROUGH</button></div>
    <p className="source-note">{source==='arbitrum'?'Playable Arbitrum Sepolia cartridge restored for recording. It is reconstructed from contract bytecode and verified before play. Preview runs are not eligible for the Robinhood daily prize pot.':'The browser reconstructs the Robinhood mainnet cartridge from contract bytecode and verifies every byte before play.'}</p>
    {!manifestAddress&&<p className="notice">Robinhood mainnet is deploying soon. The Arbitrum playthrough version is ready now.</p>}
    <dl><div><dt>LEVEL</dt><dd>EXECUTION</dd></div><div><dt>ASSETS</dt><dd>FREEDOOM 0.13.0</dd></div><div><dt>ENGINE</dt><dd>WASMDOOM</dd></div><div><dt>ROM SIZE</dt><dd>{meta?(meta.compressedSize/1048576).toFixed(2)+' MiB':'—'}</dd></div><div><dt>CHUNKS</dt><dd>{meta?Math.ceil(meta.compressedSize/24575):'—'}</dd></div></dl>
    <div className="panel-heading"><span>02</span> MISSION BRIEF</div><p className="brief">{source==='arbitrum'?<>24 hostiles. Shotgun + chaingun.<br/>Ammo and medikits around the room.<br/>The north wall is your way out.</>:<>24 hostiles. Shotgun at spawn.<br/>Chaingun deep in the arena. Only 2 medikits.<br/>The north wall is your way out.</>}</p>
    <div className="controls"><div><kbd>W A S D</kbd><span>MOVE / STRAFE</span></div><div><kbd>← →</kbd><span>TURN</span></div><div><kbd>SPACE</kbd><span>FIRE</span></div><div><kbd>CTRL</kbd><span>USE / EXIT</span></div><div><kbd>SHIFT</kbd><span>RUN</span></div><div><kbd>TAB</kbd><span>MAP</span></div></div>
    <div className="actions"><button onClick={toggleSound}>{muted?'SOUND OFF':'SOUND ON'}</button><button onClick={reset} disabled={phase==='ready'}>RESET</button></div>
   </aside>
  </section>
  {phase==='playing'&&!ranked&&<p className="notice">{source==='arbitrum'?'Arbitrum preview run: recording is ready, but this round is not eligible for the Robinhood daily prize leaderboard.':'Leaderboard unavailable. You can still play, but this round cannot be ranked.'}</p>}
  {error&&<div className="error" role="alert"><b>BOOT FAILED</b> {error}</div>}
  <div className="under-console"><span>LOAD FROM CHAIN. PLAY IN YOUR BROWSER.</span><span>Click the viewport to focus · leaving it pauses play and the timer</span></div>
  <section className="competition" id="competition" aria-labelledby="competition-title">
   <div className="competition-intro"><div><p className="eyebrow">COMPETE // SURVIVE // WIN</p><h2 id="competition-title">FASTEST OUT.<br/><em>BIGGEST PRIZE.</em></h2></div><p>Finish the arena, post your round time, and climb the leaderboard. The fastest completed runs rank first while the Robinhood Chain prize reserve grows from token trading fees.</p></div>
   <PrizePool/>
   <Leaderboard revision={revision}/>
  </section>
  <OnChain/>
  <details><summary>ROM details & source</summary><p>Independent project using original arena geometry and Freedoom resources. Level music and sound effects supported; persistent saves are outside V1. No scores or gameplay are recorded on chain.</p><p>Robinhood mainnet manifest: {manifestAddress?<a href={chain.blockExplorers.default.url+'/address/'+manifestAddress} target="_blank" rel="noreferrer">{manifestAddress}</a>:'deploying soon'} · <a href={`https://sepolia.arbiscan.io/address/${arbitrumManifestAddress}`} target="_blank" rel="noreferrer">Arbitrum playthrough manifest</a></p><p className="hash">Compressed hash: {meta?.compressedHash||'load a cartridge to verify'}</p><p><a href="https://github.com/grapefi/DOOM.exe" target="_blank" rel="noreferrer">GitHub repository ↗</a> · <a href="/source/doom-exe-source.zip">Source archive</a> · <a href="/source/wasmdoom-v0.0.2-source.zip">Engine source</a> · <a href="/licenses/wasmdoom-GPL-2.0.txt">Engine license</a> · <a href="/licenses/COPYING.txt">Freedoom license</a> · <a href="/rom/provenance.json">Asset provenance</a></p></details>
  <footer><span>DOOM.EXE <b>© 2026</b></span><span>BUILT TO RUN. STORED TO LAST.</span><span>INDEPENDENT / NOT AFFILIATED WITH ID SOFTWARE OR ROBINHOOD</span></footer>
 </main>;
}

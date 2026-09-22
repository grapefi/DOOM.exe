import {chain} from '../../shared/chain';
import {useEffect,useRef,useState} from 'react';
import {loadRom,manifestAddress,trimmedPreview,type Progress} from './romLoader';
import {startPlayer} from './doomPlayer';
import type {RomMeta} from '../../shared/rom';
export default function App(){
 const [source,setSource]=useState<'local'|'chain'>(manifestAddress&&!trimmedPreview?'chain':'local');
 const [phase,setPhase]=useState<'ready'|'loading'|'playing'|'complete'|'error'>('ready');
 const [progress,setProgress]=useState<Progress>({label:'Cartridge ready',percent:0});
 const [error,setError]=useState(''),[meta,setMeta]=useState<RomMeta>();
 const [muted,setMuted]=useState(false);
 const canvas=useRef<HTMLCanvasElement>(null),stop=useRef<(()=>void)|null>(null),abort=useRef<AbortController|null>(null),audio=useRef<AudioContext|null>(null);
 function closeAudio(){const a=audio.current;audio.current=null;if(a&&a.state!=='closed')void a.close().catch(()=>{});}
 useEffect(()=>{if(phase==='playing')canvas.current?.focus();},[phase]);
 useEffect(()=>()=>{abort.current?.abort();stop.current?.();closeAudio();},[]);
 async function launch(){
  abort.current?.abort();stop.current?.();stop.current=null;closeAudio();
  const controller=new AbortController();abort.current=controller;setError('');setMeta(undefined);setPhase('loading');
  try{audio.current=new AudioContext();if(!muted)await audio.current.resume();else await audio.current.suspend();}catch{audio.current=null;}
  try{
   const rom=await loadRom(source,setProgress,controller.signal);controller.signal.throwIfAborted();setMeta(rom.meta);
   const cleanup=await startPlayer(canvas.current!,rom.wasm,rom.wad,audio.current,()=>setPhase('complete'),message=>{setError(message);setPhase('error');});
   if(controller.signal.aborted){cleanup();return;}stop.current=cleanup;setPhase('playing');canvas.current?.focus();
  }catch(e){if(controller.signal.aborted)return;setError(e instanceof Error?e.message:'Unable to launch cartridge');setPhase('error');closeAudio();}
 }
 function reset(){abort.current?.abort();stop.current?.();stop.current=null;closeAudio();setPhase('ready');setMeta(undefined);setProgress({label:'Cartridge ready',percent:0});}
 function toggleSound(){const next=!muted;setMuted(next);if(audio.current){void (next?audio.current.suspend():audio.current.resume()).catch(()=>{});}canvas.current?.focus();}
 return <main>
  <header><a className="wordmark" href="/" aria-label="DOOM.EXE home">DOOM<span>.EXE</span></a><div className="network"><i/> ARBITRUM <b>SEPOLIA / {chain.id}</b></div><span className="version">CARTRIDGE 001</span></header>
  <section className="titlebar"><div><p className="eyebrow">EPISODE 01 // SURVIVAL</p><h1>EXECUTION<span>_</span></h1></div><p className="edition"><b>24 HOSTILES.</b><br/>ONE WAY OUT.</p></section>
  <section className="console">
   <div className="screen-column">
    <div className="screen-top"><span><i/> {source==='chain'?'CHAIN CARTRIDGE':'LOCAL CARTRIDGE'}</span><span>320 × 200 / 35 HZ</span></div>
    <div className="viewport">
     <canvas ref={canvas} tabIndex={0} aria-label="Game viewport. WASD move, arrows turn, Space fire, Control use/exit." className={phase==='playing'||phase==='complete'?'visible':''}/>
     {(phase==='ready'||phase==='error')&&<div className="boot"><p className="eyebrow">// SELECT YOUR BATTLEGROUND //</p><div className="boot-logo" aria-hidden="true">DOOM<span>.EXE</span></div><h2>ENTER THE<br/><em>EXECUTION ZONE</em></h2><p>Survive the crowd. Scavenge supplies. Reach the exit.</p><button className="primary" onClick={launch}>▶ ENTER ARENA</button><small>Desktop keyboard required · no wallet needed</small></div>}
     {phase==='loading'&&<div className="boot loading"><p className="eyebrow">BOOT SEQUENCE</p><h2>LOADING<span className="blink">_</span></h2><progress value={progress.percent} max={100}/><p role="status">{progress.label}</p><button className="text-button" onClick={reset}>CANCEL</button></div>}
     {phase==='complete'&&<div className="finished"><p className="eyebrow">EXIT REACHED</p><h2>EXECUTED.</h2><button className="primary" onClick={launch}>↻ RUN AGAIN</button></div>}
    </div>
    <div className="screen-bottom"><span className={meta?'verified':''}>{meta?'✓ ROM INTEGRITY VERIFIED':'> AWAITING EXECUTION'}</span><button onClick={()=>{void canvas.current?.requestFullscreen().catch(()=>{});}}>FULLSCREEN ↗</button></div>
   </div>
   <aside>
    <div className="panel-heading"><span>01</span> CARTRIDGE SOURCE</div>
    <div className="source-tabs" role="group" aria-label="Cartridge source"><button aria-pressed={source==='local'} disabled={phase==='loading'||phase==='playing'} onClick={()=>{reset();setSource('local');}}>LOCAL</button><button aria-pressed={source==='chain'} disabled={!manifestAddress||phase==='loading'||phase==='playing'} onClick={()=>{reset();setSource('chain');}}>ON CHAIN</button></div>
    <p className="source-note">{source==='local'?(trimmedPreview?'Optimized local preview. These smaller game files are not deployed on chain.':'Play the bundled development cartridge. These bytes are served by this website.'):'Reconstruct the cartridge from testnet contract bytecode, then verify it before play.'}</p>
    {!manifestAddress&&<p className="notice">Testnet cartridge not deployed yet. Local play is ready.</p>}
    <dl><div><dt>LEVEL</dt><dd>EXECUTION</dd></div><div><dt>ASSETS</dt><dd>FREEDOOM 0.13.0</dd></div><div><dt>ENGINE</dt><dd>WASMDOOM</dd></div><div><dt>ROM SIZE</dt><dd>{meta?(meta.compressedSize/1048576).toFixed(2)+' MiB':'—'}</dd></div><div><dt>CHUNKS</dt><dd>{meta?Math.ceil(meta.compressedSize/24575):'—'}</dd></div></dl>
    <div className="panel-heading"><span>02</span> MISSION BRIEF</div><p className="brief">24 hostiles. Shotgun + chaingun.<br/>Ammo and medikits around the room.<br/>The north wall is your way out.</p>
    <div className="controls"><div><kbd>W A S D</kbd><span>MOVE / STRAFE</span></div><div><kbd>← →</kbd><span>TURN</span></div><div><kbd>SPACE</kbd><span>FIRE</span></div><div><kbd>CTRL</kbd><span>USE / EXIT</span></div><div><kbd>SHIFT</kbd><span>RUN</span></div><div><kbd>TAB</kbd><span>MAP</span></div></div>
    <div className="actions"><button onClick={toggleSound}>{muted?'SOUND OFF':'SOUND ON'}</button><button onClick={reset} disabled={phase==='ready'}>RESET</button></div>
   </aside>
  </section>
  {error&&<div className="error" role="alert"><b>BOOT FAILED</b> {error}</div>}
  <div className="under-console"><span>LOAD FROM CHAIN. PLAY IN YOUR BROWSER.</span><span>Click the viewport to focus · leaving it pauses play</span></div>
  <details><summary>ROM details & source</summary><p>Independent project using original arena geometry and Freedoom resources. Level music and sound effects supported; persistent saves are outside V1. No scores or gameplay are recorded on chain.</p><p>Manifest: {manifestAddress?<a href={chain.blockExplorers.default.url+'/address/'+manifestAddress} target="_blank" rel="noreferrer">{manifestAddress}</a>:'not configured'}</p><p className="hash">Compressed hash: {meta?.compressedHash||'load a cartridge to verify'}</p><p><a href="/source/doom-exe-source.zip">Project source</a> · <a href="/source/wasmdoom-v0.0.2-source.zip">Engine source</a> · <a href="/licenses/wasmdoom-GPL-2.0.txt">Engine license</a> · <a href="/licenses/COPYING.txt">Freedoom license</a> · <a href="/rom/provenance.json">Asset provenance</a></p></details>
  <footer><span>DOOM.EXE <b>© 2026</b></span><span>BUILT TO RUN. STORED TO LAST.</span><span>INDEPENDENT / NOT AFFILIATED WITH ID SOFTWARE OR ROBINHOOD</span></footer>
 </main>;
}

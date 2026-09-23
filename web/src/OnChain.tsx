import {chain} from '../../shared/chain';
import {manifestAddress} from './romLoader';


export function OnChain(){return <section className="onchain" aria-labelledby="onchain-title">
 <div className="onchain-intro">
  <div><p className="eyebrow">SYSTEM ARCHITECTURE // ROBINHOOD MAINNET</p><h2 id="onchain-title">BUILT TO RUN.<br/><em>STORED ON-CHAIN.</em></h2></div>
  <p>DOOM CHAIN stores its game cartridge on Robinhood Chain mainnet. The engine and level data are rebuilt from immutable contract bytecode and verified in the browser before every round.</p>
 </div>
 <div className="chain-flow" aria-label="How the game loads from the blockchain">
  <div><span>01</span><b>74 DATA CONTRACTS</b><small>Compressed WASM engine + Freedoom arena</small></div><i aria-hidden="true">→</i>
  <div><span>02</span><b>ROM MANIFEST</b><small>Orders chunks and commits size + hashes</small></div><i aria-hidden="true">→</i>
  <div><span>03</span><b>BROWSER VERIFY</b><small>Rebuilds, decompresses and checks every byte</small></div><i aria-hidden="true">→</i>
  <div><span>04</span><b>PLAY IN BROWSER</b><small>Verified 35 Hz WASM game loop; no wallet required</small></div>
 </div>
 <div className="chain-grid cartridge-only">
  <article>
   <div className="chain-card-head"><span className="chain-status live">LIVE ON MAINNET</span><span>GAME CARTRIDGE</span></div>
   <h3>ROBINHOOD MAINNET</h3>
   <p>The optimized 1.72 MiB cartridge is stored across 74 immutable data contracts plus one manifest. The site reads their runtime bytecode and verifies the committed hashes before the engine starts.</p>
   {manifestAddress?<><p className="manifest-address"><span>VERIFIED ROM MANIFEST</span><a href={`${chain.blockExplorers.default.url}/address/${manifestAddress}#code`} target="_blank" rel="noreferrer">{manifestAddress}</a></p><a href={`${chain.blockExplorers.default.url}/address/${manifestAddress}#code`} target="_blank" rel="noreferrer">VIEW ON ROBINSCAN ↗</a></>:<span className="manifest-pending">MANIFEST ADDRESS PUBLISHES AFTER DEPLOYMENT</span>}
  </article>

 </div>
 <div className="optimization">
  <div><p className="eyebrow">CARTRIDGE OPTIMIZATION</p><h3>72.9% SMALLER.<br/>SAME EXECUTION ARENA.</h3><p>The optimized cartridge removes assets this arena never calls while keeping the engine, map, enemies, weapons, menus, sound effects and E1M1 music required to play.</p></div>
  <div className="size-compare" aria-label="Original and optimized cartridge comparison">
   <div><span>ORIGINAL BUILD</span><strong>271</strong><small>CHUNKS · 6.34 MiB</small><i/></div>
   <div className="optimized"><span>MAINNET BUILD</span><strong>74</strong><small>CHUNKS · 1.72 MiB</small><i/></div>
  </div>
  <p className="optimization-note">The tested 74-chunk build is deployed on Robinhood mainnet. It cuts storage transactions by 72.9% while keeping the arena, enemies, weapons, menus, sound effects and music required to play.</p>
 </div>
 <div className="expansion">
  <div><p className="eyebrow">EXPANSION PATHS</p><h3>ONE CARTRIDGE.<br/>A LARGER WORLD.</h3></div>
  <ol>
   <li><span>01</span><div><b>NEW LEVELS</b><p>Ship additional maps as new immutable cartridges, each with its own manifest, checksum and leaderboard.</p></div></li>
   <li><span>02</span><div><b>CAMPAIGN</b><p>Link cartridges into episodes with persistent progress, par times and cumulative season rankings.</p></div></li>
   <li><span>03</span><div><b>PvP ARENAS</b><p>Add real-time multiplayer servers for movement and combat while preserving verifiable map builds and public match results.</p></div></li>
   <li><span>04</span><div><b>ON-CHAIN SEASONS</b><p>Use Robinhood Chain for transparent prize reserves, tournament rules and auditable payouts around competitive play.</p></div></li>
  </ol>
 </div>
 <p className="architecture-note">Today, gameplay and leaderboard results run off-chain. On-chain storage proves the cartridge bytes; it does not prove player inputs or match outcomes.</p>
 </section>}

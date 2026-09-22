import {chain} from '../../shared/chain';
import {manifestAddress} from './romLoader';
import {MSFT_TOKEN,PRIZE_EXPLORER,PRIZE_WALLET} from '../../shared/prizePool';

const MANIFEST=manifestAddress||'0x9263dcd41931a92055188d9a5f8689eac0c4f03b';

export function OnChain(){return <section className="onchain" aria-labelledby="onchain-title">
 <div className="onchain-intro">
  <div><p className="eyebrow">SYSTEM ARCHITECTURE // TWO CHAINS</p><h2 id="onchain-title">BUILT TO RUN.<br/><em>STORED ON-CHAIN.</em></h2></div>
  <p>DOOM.EXE is a browser game whose engine and level data can be rebuilt from immutable contract bytecode. The current game cartridge lives on Arbitrum Sepolia; its MSFT prize pool is tracked separately on Robinhood Chain.</p>
 </div>
 <div className="chain-flow" aria-label="How the game loads from the blockchain">
  <div><span>01</span><b>271 DATA CONTRACTS</b><small>Compressed WASM engine + Freedoom arena</small></div><i aria-hidden="true">→</i>
  <div><span>02</span><b>ROM MANIFEST</b><small>Orders chunks and commits size + hashes</small></div><i aria-hidden="true">→</i>
  <div><span>03</span><b>BROWSER VERIFY</b><small>Rebuilds, decompresses and checks every byte</small></div><i aria-hidden="true">→</i>
  <div><span>04</span><b>PLAY LOCALLY</b><small>35 Hz WASM game loop; no wallet required</small></div>
 </div>
 <div className="chain-grid">
  <article>
   <div className="chain-card-head"><span className="chain-status live">LIVE</span><span>GAME CARTRIDGE</span></div>
   <h3>ARBITRUM SEPOLIA</h3>
   <p>The published cartridge is 6.34 MiB compressed across 271 immutable data contracts plus one manifest. The site reads their runtime bytecode and verifies the committed hashes before the engine starts.</p>
   <a href={`${chain.blockExplorers.default.url}/address/${MANIFEST}`} target="_blank" rel="noreferrer">VIEW ROM MANIFEST ↗</a>
  </article>
  <article>
   <div className="chain-card-head"><span className="chain-status live">LIVE</span><span>PRIZE RESERVE</span></div>
   <h3>ROBINHOOD CHAIN</h3>
   <p>The public prize wallet holds canonical MSFT stock tokens. The site reads its balance directly from Robinhood Chain and values it with Chainlink’s multiplier-adjusted MSFT token feed.</p>
   <div className="chain-links"><a href={`${PRIZE_EXPLORER}/address/${PRIZE_WALLET}`} target="_blank" rel="noreferrer">PRIZE WALLET ↗</a><a href={`${PRIZE_EXPLORER}/token/${MSFT_TOKEN}`} target="_blank" rel="noreferrer">MSFT TOKEN ↗</a></div>
  </article>
 </div>
 <div className="optimization">
  <div><p className="eyebrow">CARTRIDGE OPTIMIZATION</p><h3>72.9% SMALLER.<br/>SAME EXECUTION ARENA.</h3><p>The optimized candidate removes assets this arena never calls while keeping the engine, map, enemies, weapons, menus, sound effects and E1M1 music required to play.</p></div>
  <div className="size-compare" aria-label="Original and optimized cartridge comparison">
   <div><span>DEPLOYED V1</span><strong>271</strong><small>CHUNKS · 6.34 MiB</small><i/></div>
   <div className="optimized"><span>OPTIMIZED CANDIDATE</span><strong>74</strong><small>CHUNKS · 1.72 MiB</small><i/></div>
  </div>
  <p className="optimization-note">The 74-chunk build is tested and included in the source, but it has not been deployed on-chain yet. It reduces storage transactions and makes a future Robinhood Chain cartridge substantially more practical.</p>
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

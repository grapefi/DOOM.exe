# DOOM.EXE V1

A playable, original **EXECUTION** arena using Freedoom 0.13.0 resources, a standalone DOOM-compatible WASM engine, and immutable EVM ROM storage.

**Status:** the public website loads its optimized cartridge from **Robinhood Chain mainnet (4663)**: 74 immutable data contracts plus a manifest, about 1.72 MiB compressed. The deployment address and pinned hash are recorded in `shared/mainnetDeployment.json`. Gameplay and leaderboard results run in the browser and website backend, not in smart contracts.

## Quick start

Use Node.js 24 LTS and pnpm 11.

```sh
pnpm install --frozen-lockfile
# On first setup only: copy .env.example to .env (do not overwrite an existing signer).
pnpm run assets
pnpm run bundle
pnpm run music
pnpm run dev
```

Open the printed localhost address to inspect the site. Public gameplay loads the published mainnet cartridge by default. Optional `.env` values can override the mainnet manifest address and pinned ROM hash. The delivered source includes prepared assets and ROM files for build, validation and deployment. Asset downloads require internet access. The browser uses modern WebAssembly and DecompressionStream support (current Chrome, Edge, Firefox or Safari). Serve over localhost or HTTPS; opening index.html directly does not work.

Controls: W/S forward/back, A/D strafe, arrow keys turn, Space fire, Ctrl/E use the north-wall exit, Shift run, Tab map. Click the game to focus; it pauses when it loses focus. Collect the shotgun at spawn and push through the arena to reach the chaingun near the north side. The crowded survival arena has 24 enemies (eight former humans, twelve imps and four melee demons), two shell boxes, two bullet boxes and only two medikits on exposed side lanes. The browser locks the use/exit action until all 24 enemies are dead. Reaching the exit shows the completion overlay. Reset/replay starts a fresh instance.

This is a desktop keyboard V1. The layout adapts to small screens, but touch/gamepad controls, persistent saves and multiplayer are not implemented. Daily leaderboards and wallet-address score submissions are available; automated prize payouts and rollover are not implemented. Sound effects and looping Freedoom E1M1 level music are supported.

## Rebuild after level edits

Edit `scripts/wad.ts`, then run `pnpm run level` and `pnpm run bundle`. This reuses the verified local Freedoom resources without downloading them again. Run `pnpm run smoke`, `pnpm run source` and `pnpm run build` to verify and update the preview.

## Test and build

```sh
pnpm run test
pnpm run smoke
pnpm run compile
pnpm run source
pnpm run build
pnpm run preview
```

- Contract tests deploy the actual Solidity code to an in-memory Ganache EVM with Robinhood mainnet chain ID 4663.
- Integrity tests cover corruption, size limits, truncated gzip, malformed boundaries and unsupported metadata.
- The WASM smoke test uses the real engine and generated WAD, checks all 24 live spawns, rendering, movement and firing, then isolates ammo/health pickups and the exit with monsters disabled.
- Solidity is pinned to 0.8.30, optimizer 200 runs, Paris target. No PUSH0 or newer opcode dependency.
- Ganache may report that its optional native websocket module is unavailable on Node 24; its JS fallback runs these tests successfully.
- A frozen pnpm lockfile is included. Optional native Ganache acceleration builds are disabled.

## Robinhood Chain mainnet deployment

The defaults follow the [official Robinhood Chain network configuration](https://docs.robinhood.com/chain/connecting/) and [deployment documentation](https://docs.robinhood.com/chain/deploy-smart-contracts/):

| Setting | Value |
| --- | --- |
| Chain ID | 4663 |
| RPC | https://rpc.mainnet.chain.robinhood.com |
| Gas token | ETH |
| Explorer | https://robinhoodchain.blockscout.com |

1. Copy `.env.example` to `.env`.
2. Fund a dedicated deployment account with ETH on Robinhood Chain.
3. Set `PRIVATE_KEY`, `RPC_URL`, and a deliberate `MAX_DEPLOYMENT_ETH` fee cap in `.env`. Keep keys out of VITE variables, source control, screenshots and frontend hosting configuration.
4. Inspect the ROM plan, then explicitly broadcast:

```sh
pnpm run deploy
pnpm run deploy --broadcast
```

The first command only compiles and validates the local ROM; it sends **no transactions**. Use `pnpm run deploy`, because `pnpm deploy` without `run` is pnpm's unrelated workspace deployment command.

The broadcast script defaults to the tested optimized cartridge, verifies Robinhood mainnet chain ID 4663, deploys each chunk sequentially, waits for two confirmations, checks balance and transaction fee ceilings, and creates the manifest last. It refuses any other chain. Gas limits and gas prices receive 20% buffers; the fee cap is checked before each transaction against recorded receipt costs.

Progress is checkpointed in `deployments/4663-<compressedHash>.json`. Re-run the same command with the same account and ROM to resume. Pending transactions are awaited and stored chunks are compared byte-for-byte before reuse. Do not delete the checkpoint or run two deployers for the same ROM concurrently. If a process crashes between sending a transaction and writing its hash, inspect the deployer account in the explorer before resuming; an orphaned chunk can otherwise be deployed twice. A dropped pending transaction needs manual inspection or replacement; the script intentionally does not guess.

5. Verify the published manifest against the local build:

```sh
pnpm run verify 0xYourManifestAddress
```

6. Copy the printed `VITE_MANIFEST_ADDRESS` and `VITE_ROM_HASH` to `.env`, set `VITE_RPC_URL`, then rebuild:

```sh
pnpm run source
pnpm run build
```

The browser only exposes chain loading. Reading and playing require no wallet or transaction. An RPC URL exposed with VITE is public; use a browser-safe endpoint with domain restrictions if it has an API key. The public endpoint is rate-limited, so production may use a dedicated provider; reads are batched four at a time with retries.

## Actual V1 size

The deployed optimized ROM is **1,802,242 compressed bytes (1.72 MiB)**, requiring **74 data contracts plus one manifest**. The original untrimmed build used 271 data contracts.

The optimized build removes resources unused by this arena while retaining gameplay assets, sound effects, and E1M1 music. Engine tests compare simulation and sound behavior against the untrimmed build.

The original build’s code-deposit cost alone is at least **1,330,250,200 gas** across the chunk transactions. This is not a deployment quote: constructor execution, transaction overhead, the manifest, and L1 data fees are extra. The optimized build cuts the cartridge to 74 chunks. Run the planning command and review current Robinhood Chain fees before broadcasting.

## Storage and verification

```text
WASM + standalone IWAD
  → DEXEROM1 binary envelope
  → gzip level 9
  → chunks of up to 24,575 bytes
  → STOP-prefixed runtime bytecode contracts
  → immutable ordered RomManifest
  → eth_getCode → compressed keccak256 → bounded gzip decode
  → raw keccak256 → file boundaries/WAD validation → WASM boot
```

The envelope is 8 ASCII magic bytes, two little-endian uint32 file lengths, then WASM bytes followed by IWAD bytes. The manifest version fixes gzip and envelope version 1; it stores compressed/raw sizes and Keccak-256 hashes.

`DataChunk` returns `0x00 || payload` from its constructor. The leading STOP makes calls harmless and leaves a maximum 24,576-byte EIP-170 runtime. It has no owner, update path or self-destruct path.

`RomManifest` accepts ordered chunk addresses, bounds their lengths and STOP prefix, enforces full-sized interior chunks and checks the total. It has no mutation methods. The constructor does **not** prove that the chunks match its supplied hash: the deployer and every reader must verify the commitments. The browser reads all contract data at a single freshly fetched block number, enforces a 25,164,800-byte compressed cap and 64 MiB raw cap, and rejects any mismatch before execution. `VITE_ROM_HASH` adds a build-time commitment independent of the manifest.

The frontend, manifest address and RPC remain trust inputs. Hash verification proves bytes match a commitment, not that an arbitrary engine is safe or that an RPC is honest. Use the pinned release and audit the code before valuable deployments. Gameplay executes in the browser and outcomes are not validated on chain.

The cartridge is served as **rom.bin**, even though its contents are gzip. Configure hosting to serve it as opaque bytes; do not set `Content-Encoding: gzip` for the stored file. That header would cause the browser to decode the cartridge before hash verification. Ordinary transparent transport compression is fine only if the application receives the original stored compressed bytes.

## Files

- `contracts/`: immutable storage contracts.
- `shared/`: network, ABI, binary ROM format and engine boot interface.
- `scripts/`: asset preparation, original map generation, source packaging, bundle, compile, resume deployment and independent verification.
- `web/src/`: branded React loader, input, rendering and sound-effect adapter.
- `game/`: prepared WASM, IWAD and asset provenance.
- `web/public/source/`: exact engine build sources and application source ZIP.
- `web/public/licenses/`: engine GPL, Freedoom license and credits.
- `tests/`: EVM and ROM integrity tests.

## Engine and asset provenance

Engine: [wasmdoom v0.0.2](https://github.com/theMagicalKarp/wasmdoom/releases/tag/v0.0.2), source commit `3edb40afadefe6b2d2955e02fa83b74f1b89bc7f`. The asset script checks the published release binary SHA-256 `caa3d9152830738325d0b0b2b1448c4cef25edeed1e3a5f979f6c7bbfada1683`. It fetches only the engine's source/build files, excluding upstream's `wads/` directory.

To rebuild that engine, extract the provided source ZIP, install Zig 0.16.0 and run `zig build -Doptimize=ReleaseSmall`. The output is `zig-out/bin/wasmdoom.wasm`; no WAD is required to compile it. The shipped binary is the upstream release artifact, not a locally reproduced binary. Custom builds need an explicit provenance update before bundling.

Resources: [official Freedoom 0.13.0 release](https://github.com/freedoom/freedoom/releases/tag/v0.13.0). The preparation script checks the archive against a pinned SHA-256 and the release checksum file, extracts only Freedoom data and its notices, and records the archive and generated IWAD hashes. The pinned checksum records the upstream release verified during this build; it is not an independently authenticated signature.

Geometry: `scripts/wad.ts` generates the original one-room EXECUTION arena. All 36 episode/map slots intentionally resolve to the same arena so legacy menus do not reference missing maps. The browser launches E1M1 and stops at the first completion. The WAD still displays some Freedoom menu labels.

The project code and original map generator are GPL-2.0-or-later; Freedoom resources retain their upstream license. Keep the licenses, credits, corresponding source downloads, and build instructions with every distributed build. `pnpm run source` refreshes the application source archive before publishing. See `THIRD_PARTY_NOTICES.md`.

## Hosting

`dist/` contains the production client and leaderboard Worker. Publish the complete directory with HTTPS. No wallet connection is required. The interface self-hosts Press Start 2P with system monospace fallbacks; fonts and game assets do not load from a third-party CDN.

The public build automatically excludes bundled playable ROM binaries and exposes only the Robinhood Chain loader. Licenses, source files and provenance remain available. Updating a cartridge means deploying a new manifest and changing the frontend’s address and hash pin; existing manifests cannot be edited.

## Optimized Robinhood mainnet cartridge

Run `pnpm run trim` then `pnpm run check:trim`. The mainnet WAD is `game/trimmed/doomexe.wad`; its ROM, manifest and provenance are in `web/public/rom-trimmed/`. The deployment script uses this optimized cartridge by default.

The optimized cartridge is 1,802,299 compressed bytes (74 chunks), down from 6,650,980 bytes (271 chunks): a 72.90% reduction. WAD size falls from 18,043,077 to 3,516,506 bytes. No new deployment has been performed.

The trim policy is specific to the current arena: complete required sprite families, shared/UI sounds, texture patch dependencies, global switch/sky dependencies, menus and 36 map aliases remain. Unused monster/weapon/scenery sprites, unused texture patches/flats and absent actor sounds are removed. Freedoom E1M1 music is converted from MIDI to MUS and retained with GENMIDI instruments. Other tracks become 17-byte silent compatibility entries. Keep upstream licenses. Re-audit the trim policy when adding enemies, weapons or changing geometry.

Validation: survival smoke passed, plus 3,081 ticks with identical player snapshots and sound samples versus the original. The render comparison finds up to five differing pixels in 91 frames, so this is not a claim of pixel-exact rendering. Menus, automap, four available weapons and player death are covered; exhaustive engine/menu paths are not.

## Level music

The website synthesizes the licensed Freedoom E1M1 track with wasmdoom's 15,040-byte OPL music synthesizer, served from `/audio/wasmdoom.music.wasm`. This small playback component is a website asset, separate from the on-chain ROM. Its pinned SHA-256 is checked both by `pnpm run music` and by the browser. Corresponding synth sources are included in the engine source ZIP; upstream GPL notices remain available. The optimized mainnet ROM retains the track and instruments.

Music loops beneath sound effects, follows the SOUND ON/OFF control, pauses when the game loses focus or the tab is hidden, and stops on level completion/reset. It starts after Enter Arena, respecting browser autoplay restrictions. `pnpm run check:music` exercises the actual worklet with the Freedoom track, checking nonzero finite stereo PCM, pause/resume and disposal. MIDI-to-MUS conversion uses a 140 Hz timebase. The soundtrack is fixed to this level; the in-engine music-volume slider controls its volume.

## Round results and shared leaderboard

Death freezes the round, stops sound playback and shows a Play Again screen. Completing the exit shows the final time and a name form for the shared top-50 leaderboard. Both Ctrl keys (or E) use the exit; Space fires. Fullscreen includes the result overlays.

Round time uses game steps at 35 Hz, excludes loading and stops while the viewport is unfocused or the tab is hidden. It resets on every replay and stops on death or completion. A completed run can be submitted once under a 2–20 character public display name; retries are idempotent. Rankings sort by elapsed time ascending, then completion time. Names are guest display names, not verified accounts. Results are browser-reported casual scores, not server-verified gameplay or on-chain records.

The website now includes a Cloudflare Worker and a managed D1 binding named DB. Drizzle migrations in drizzle/ are applied by Sites on publication. The ROM and on-chain contracts are unchanged. Server endpoints provide start/finish receipts, reject dead or unfinished runs, bound timings, and preserve immutable finishes. Failed saves retain the entered name and can be retried. If storage is unavailable at round start, gameplay remains available as an unranked run.

Build: pnpm build. Local full-stack preview: pnpm exec tsx scripts/preview-server.ts (http://127.0.0.1:4175), after building. Its SQLite database stays in ignored work/ and is never published. Checks: pnpm exec tsx scripts/check-round.ts and pnpm exec tsx scripts/check-leaderboard.ts. Production uses the same handler with D1.

## Round sharing and MSFT prize pool

Completed rounds and leaderboard rows open an X/Twitter compose link with the time and https://doomexe.online/. Players review and post themselves. The leaderboard header also offers a general challenge link.

The prize pool reads the canonical Robinhood MSFT balance of 0xc0702Ae0374F83fc3bA71CE2B30A323b09EC19da on Robinhood Chain mainnet (4663). Token: 0xe93237C50D904957Cf27E7B1133b510C669c2e74, verified against https://api.robinhood.com/rhj/assets. The browser reads the public RPC directly to avoid shared-host rate limits; no wallet connection is needed. Chainlink proxy 0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E supplies the multiplier-adjusted MSFT token price (never multiply twice). Quotes require a positive answer, unpaused oracle, current chain block, and age within the published 24-hour heartbeat plus five minutes. Source: https://docs.chain.link/data-feeds/tokenized-equity-feeds/robinhood. The server fallback uses Robinhood's bid/ask midpoint and currentMultiplier. Both use integer arithmetic and cent rounding.

The display refreshes every minute; the server caches successful lookups for 30 seconds. Stale, halted, malformed or unavailable quotes do not become a zero-valued nonzero balance. RPC failures show an unavailable/last-confirmed state. The card links to the wallet and token for verification. This feature displays wallet funds; it does not route trading fees, move funds or pay out prizes automatically.

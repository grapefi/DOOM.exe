# DOOM.EXE V1

A playable, original **EXECUTION** arena using Freedoom 0.13.0 resources, a standalone DOOM-compatible WASM engine, and immutable EVM ROM storage.

**Status:** local game and production build work; contracts are tested on an in-memory EVM. **Deployed and fully verified on Arbitrum Sepolia (421614).** Manifest: [0x9263dcd41931a92055188d9a5f8689eac0c4f03b](https://sepolia.arbiscan.io/address/0x9263dcd41931a92055188d9a5f8689eac0c4f03b). Deployment used 0.1737814442988288 testnet ETH across 272 successful transactions. The website defaults to this cartridge when configured from `.env.example`. No proprietary DOOM WAD, artwork, music, or logo is included.

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

Open the printed localhost address and choose **Enter arena**. The delivered ZIP already includes prepared assets and ROM files; the assets and bundle commands reproduce them. Asset downloads require internet access. The browser uses modern WebAssembly and DecompressionStream support (current Chrome, Edge, Firefox or Safari). Serve over localhost or HTTPS; opening index.html directly does not work.

Controls: W/S forward/back, A/D strafe, arrow keys turn, Ctrl fire, Space/E use the north-wall exit, Shift run, Tab map. Click the game to focus; it pauses when it loses focus. Move to collect the shotgun at spawn; a chaingun is immediately to the right and armor ahead. The crowded survival arena has 24 enemies (eight former humans, twelve imps and four melee demons), six shell boxes, six bullet boxes and eight medikits. Sweep the perimeter to replenish supplies. The exit is usable even before all enemies are defeated. Reaching the exit shows the completion overlay. Reset/replay starts a fresh instance.

This is a desktop keyboard V1. The layout adapts to small screens, but touch/gamepad controls, persistent saves, multiplayer, tournaments and rewards are not implemented. Sound effects and looping Freedoom E1M1 level music are supported.

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

- Contract tests deploy the actual Solidity code to an in-memory Ganache EVM with chain ID 421614.
- Integrity tests cover corruption, size limits, truncated gzip, malformed boundaries and unsupported metadata.
- The WASM smoke test uses the real engine and generated WAD, checks all 24 live spawns, rendering, movement and firing, then isolates ammo/health pickups and the exit with monsters disabled.
- Solidity is pinned to 0.8.30, optimizer 200 runs, Paris target. No PUSH0 or newer opcode dependency.
- Ganache may report that its optional native websocket module is unavailable on Node 24; its JS fallback runs these tests successfully.
- A frozen pnpm lockfile is included. Optional native Ganache acceleration builds are disabled.

## Arbitrum Sepolia deployment

The defaults follow the [official network configuration](https://docs.arbitrum.io/for-devs/dev-tools-and-resources/chain-info) and [deployment documentation](https://docs.arbitrum.io/for-devs/dev-tools-and-resources/chain-info):

| Setting | Value |
| --- | --- |
| Chain ID | 421614 |
| RPC | https://sepolia-rollup.arbitrum.io/rpc |
| Gas token | testnet ETH |
| Explorer | https://sepolia.arbiscan.io |

1. Copy `.env.example` to `.env`.
2. Fund a dedicated testnet account with Arbitrum Sepolia ETH.
3. Set `PRIVATE_KEY`, `RPC_URL`, and a deliberate `MAX_DEPLOYMENT_ETH` fee cap in `.env`. Keep keys out of VITE variables, source control, screenshots and frontend hosting configuration.
4. Inspect the ROM plan, then explicitly broadcast:

```sh
pnpm run deploy
pnpm run deploy --broadcast
```

The first command only compiles and validates the local ROM; it sends **no transactions**. Use `pnpm run deploy`, because `pnpm deploy` without `run` is pnpm's unrelated workspace deployment command.

The broadcast script verifies RPC chain ID 421614, deploys each chunk sequentially, waits for two confirmations, checks balance and transaction fee ceilings, and creates the manifest last. It refuses mainnet or another chain. Gas limits and gas prices receive 20% buffers; the fee cap is checked before each transaction against recorded receipt costs.

Progress is checkpointed in `deployments/421614-<compressedHash>.json`. Re-run the same command with the same account and ROM to resume. Pending transactions are awaited and stored chunks are compared byte-for-byte before reuse. Do not delete the checkpoint or run two deployers for the same ROM concurrently. If a process crashes between sending a transaction and writing its hash, inspect the deployer account in the explorer before resuming; an orphaned chunk can otherwise be deployed twice. A dropped pending transaction needs manual inspection/replacement; the script intentionally does not guess.

5. Verify the published manifest against the local build:

```sh
pnpm run verify 0xYourManifestAddress
```

6. Copy the printed `VITE_MANIFEST_ADDRESS` and `VITE_ROM_HASH` to `.env`, set `VITE_RPC_URL`, then rebuild:

```sh
pnpm run source
pnpm run build
```

The browser defaults to chain loading once the manifest address is configured. Reading and playing require no wallet or transaction. An RPC URL exposed with VITE is public; use a browser-safe endpoint with domain restrictions if it has an API key. The default public endpoint may rate-limit a large cartridge; reads are batched four at a time with retries.

## Actual V1 size

The prepared ROM is **6,651,025 compressed bytes (6.34 MiB)** and **18,356,760 raw bytes**, requiring **271 data contracts plus one manifest**. Engine: 311,507 bytes. IWAD: 18,045,237 bytes.

This first working build retains the complete Freedoom Phase 1 shared resources and replaces campaign geometry with the original arena. It does **not** meet the earlier speculative 0.8–1.8 MB target. Pruning unused textures, sprites, sounds and music is a separate optimization; deleting lumps blindly can break engine initialization or animations.

Code-deposit cost alone is at least **1,330,259,200 gas** across the chunk transactions. This is not a deployment quote: constructor execution, transaction overhead, the manifest, and L1 data fees are extra. Review testnet usage and measured fees before choosing any future network or budget. The plan prints the exact count for each rebuild. There is no mainnet deploy mode.

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

The frontend, manifest address and RPC remain trust inputs. Hash verification proves bytes match a commitment, not that an arbitrary engine is safe or that an RPC is honest. Use the pinned release and audit the code before valuable deployments. Testnet persistence is not guaranteed. Gameplay and outcomes run locally and are not validated on chain.

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

`dist/` is a static site. Publish the complete directory to a static host with HTTPS, including ROM, licenses and source ZIPs. No backend or wallet connection is required. The interface self-hosts Press Start 2P with system monospace fallbacks; fonts and game assets do not load from a third-party CDN.

For a chain-only public build, remove only `dist/rom/rom.bin` after building and hide/disable the local cartridge option in the frontend. Keep licenses/source files and provenance available. Updating a cartridge means deploying a new manifest and changing the frontend's address and hash pin; existing manifests cannot be edited.

## Optimized local cartridge

Run `pnpm run trim` then `pnpm run check:trim`. The original deployed cartridge stays intact. The candidate WAD is `game/trimmed/doomexe.wad`; its ROM, manifest and provenance are in `web/public/rom-trimmed/`. Open `/?preview=trimmed` to play this candidate locally. The normal URL still loads the existing on-chain cartridge.

The optimized cartridge is 1,802,348 compressed bytes (74 chunks), down from 6,651,025 bytes (271 chunks): a 72.90% reduction. WAD size falls from 18,045,237 to 3,518,666 bytes. No new deployment has been performed.

The trim policy is specific to the current arena: complete required sprite families, shared/UI sounds, texture patch dependencies, global switch/sky dependencies, menus and 36 map aliases remain. Unused monster/weapon/scenery sprites, unused texture patches/flats and absent actor sounds are removed. Freedoom E1M1 music is converted from MIDI to MUS and retained with GENMIDI instruments. Other tracks become 17-byte silent compatibility entries. Keep upstream licenses. Re-audit the trim policy when adding enemies, weapons or changing geometry.

Validation: survival smoke passed, plus 3,081 ticks with identical player snapshots and sound samples versus the original. The render comparison finds up to five differing pixels in 91 frames, so this is not a claim of pixel-exact rendering. Menus, automap, four available weapons and player death are covered; exhaustive engine/menu paths are not.

## Level music

The website synthesizes the licensed Freedoom E1M1 track with wasmdoom's 15,040-byte OPL music synthesizer, served from `/audio/wasmdoom.music.wasm`. This small playback component is a website asset, separate from the on-chain ROM. Its pinned SHA-256 is checked both by `pnpm run music` and by the browser. Corresponding synth sources are included in the engine source ZIP; upstream GPL notices remain available. The original on-chain cartridge already contains the track and instruments, so music works without redeployment. The optimized local ROM now retains them too.

Music loops beneath sound effects, follows the SOUND ON/OFF control, pauses when the game loses focus or the tab is hidden, and stops on level completion/reset. It starts after Enter Arena, respecting browser autoplay restrictions. `pnpm run check:music` exercises the actual worklet with the Freedoom track, checking nonzero finite stereo PCM, pause/resume and disposal. MIDI-to-MUS conversion uses a 140 Hz timebase. The soundtrack is fixed to this level; the in-engine music-volume slider controls its volume.

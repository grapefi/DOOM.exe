# Third-party notices

## wasmdoom engine

Upstream: https://github.com/theMagicalKarp/wasmdoom  
Version: v0.0.2  
Source commit: 3edb40afadefe6b2d2955e02fa83b74f1b89bc7f

Based on the open-source DOOM engine by id Software, with the upstream contributors' WebAssembly port. Preserve upstream copyright notices. The full GPL-2.0 text is distributed in LICENSE and web/public/licenses/wasmdoom-GPL-2.0.txt. Exact engine C sources and build files are distributed as web/public/source/wasmdoom-v0.0.2-source.zip.

No original id Software WAD or other proprietary game data is used.

## Freedoom

Freedoom 0.13.0 Phase 1 resources, from the official release:
https://github.com/freedoom/freedoom/releases/tag/v0.13.0

The generated IWAD replaces the campaign maps with original geometry; shared graphics, sounds and other resources are by Freedoom contributors. Full upstream license and credit files are in web/public/licenses/COPYING.txt and CREDITS.txt. Preserve them when redistributing this project or the IWAD.

## DOOM.EXE project

Original map generator, contracts, ROM tooling and frontend: GPL-2.0-or-later. No copied proprietary DOOM logo; the wordmark and executable icon are text/CSS/SVG created for this project. This independent project is not affiliated with id Software or Robinhood.

JavaScript package licenses are retained in installed packages and the dependency lockfile identifies versions. The frontend self-hosts Press Start 2P under the SIL Open Font License; its notice is in web/public/fonts/OFL.txt. The arena preview is a screenshot of the bundled Freedoom-compatible game.

The website also uses wasmdoom v0.0.2 music synthesizer (GPL-2.0), with corresponding sources in the engine source archive. Level music and GENMIDI instruments come from the same licensed Freedoom 0.13.0 IWAD; MIDI is converted to MUS for playback.

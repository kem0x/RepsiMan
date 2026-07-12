# RepsiMan

RepsiMan is an experimental native and WebAssembly recompilation project for
the PlayStation game *Pepsiman*. The current milestone runs the original game
logic on macOS and in a browser; portability and quality-of-life improvements
are the next milestones.

RepsiMan remains the game-specific repository and deployment. It is listed on
the broader [Recomps](https://recomps.ol.mr) collection site, allowing future
games to keep independent code, releases, browser storage, and compatibility
notes.

This repository does **not** include a PlayStation BIOS, game disc, extracted
game executable, generated game code, memory cards, or save states. You must
supply legally obtained copies of the required assets yourself.

## Current targets

- Native macOS build
- Browser/WebAssembly build with persistent keyboard remapping, controller
  detection, and SDL gamepad support
- Automatic browser memory-card persistence with raw card import/export
- Persistent Original, Enhanced, and Custom QoL settings, including optional
  fast boot, 2x CD loading, low-latency input, pause, and output filtering
- Experimental browser title branding and an enhanced in-level pause menu with
  Resume and Return to Title actions; same-level restart remains a visible WIP
- Experimental opt-in 16:9 presentation with 4:3 FMV pillarboxing
- Bring-your-own BIOS and CUE/BIN files in the browser

Android, fully validated widescreen gameplay, higher frame rates, and
additional quality-of-life features are planned, not yet supported release
targets.

## Source setup

Clone with submodules:

```sh
git clone --recurse-submodules https://github.com/kem0x/RepsiMan.git
cd RepsiMan
```

Place your own extracted game files where `game.toml` expects them, then
generate the ignored recompilation output:

```sh
cmake -S psxrecomp/recompiler -B psxrecomp/recompiler/build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release
cmake --build psxrecomp/recompiler/build
psxrecomp/recompiler/build/psxrecomp-game --config game.toml
```

The exact extraction workflow still needs to be packaged into a clean-room
setup script before the first public release.

## Native build

```sh
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/Pepsiman_Recompiled
```

## Web build

Activate Emscripten and run:

```sh
emcmake cmake -S . -B build-web -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DPSX_LAUNCHER=OFF \
  -DPSX_DEBUG_TOOLS=OFF
cmake --build build-web -j4
python3 web/serve.py
```

Open <http://127.0.0.1:8080/Pepsiman_Recompiled.html>. Browser threads require
the COOP/COEP headers supplied by `web/serve.py`; opening the HTML directly will
not work. The **Controls** panel remaps Player 1 keyboard input, saves it in the
browser, and reports connected gamepads. See [web/README.md](web/README.md) for
browser and LAN testing notes.

The **Settings** panel keeps every QoL change optional. **Original** preserves
the standard boot and disc timings, **Enhanced** enables the conservative fast
boot/load and focus-pause options, and changing an individual switch creates a
**Custom** preset. Launch-time options are clearly marked; pause, output
filtering, memory-card autosave, and remembered-file permissions change live.
During a level, Start or the toolbar **Pause** button opens the enhanced pause
menu. Resume and Return to Title can be selected with keyboard, mouse, or a
standard gamepad. Restart Level remains disabled until Pepsiman's native
same-scene reload path is verified. This first iteration is browser-only while
its game-state detection and reset behavior are validated locally.
The **Widescreen** switch enables the framework's experimental 16:9 world-view
path on the next launch. It is deliberately excluded from the Enhanced preset
until every level has been checked for culling, HUD, and world-edge artifacts.

On browsers with the File System Access API, the BIOS and disc picker handles
are stored locally in IndexedDB. Returning visits restore the files
automatically when permission remains active, or offer one **Reconnect saved
files** action when the browser asks for permission again. No literal path or
game-file contents are uploaded.

The browser **Saves** panel automatically preserves both real PlayStation
memory-card slots in IndexedDB. Raw 128 KiB `.mcd` cards can be imported before
launch or exported at any time for backups and native/emulator interoperability.

To assemble the asset-free Cloudflare Pages package after building:

```sh
scripts/package-web.sh
npx wrangler pages deploy dist-web --project-name repsiman
```

The package script copies only `index.html`, the JavaScript runtime, the WASM
module, and the required Pages headers. It rejects a missing build and never
copies `.data`, BIOS, CUE, or BIN files.

The static collection hub lives in `hub/` and deploys independently to the
`recomps` Pages project. Its game cards link to the separately deployed recomp
sites, so adding another game does not increase the hub's runtime footprint.

## Licensing and game assets

The pinned PSXRecomp framework is licensed under the PolyForm Noncommercial
License 1.0.0. Because that license restricts commercial use, this project
should currently be described as **source-available for noncommercial use**, not
as OSI-approved open-source software. RepsiMan's original files do not yet have
an explicit license; no license is granted merely by making the repository
public.

*Pepsiman*, PlayStation, and related names and assets belong to their respective
owners. This is an unofficial preservation and engineering project and is not
affiliated with or endorsed by them.

See [PUBLICATION.md](PUBLICATION.md) before creating a public repository.

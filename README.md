# RepsiMan

RepsiMan is an experimental native and WebAssembly recompilation project for
the PlayStation game *Pepsiman*. The current milestone runs the original game
logic on macOS and in a browser; portability and quality-of-life improvements
are the next milestones.

This repository does **not** include a PlayStation BIOS, game disc, extracted
game executable, generated game code, memory cards, or save states. You must
supply legally obtained copies of the required assets yourself.

## Current targets

- Native macOS build
- Browser/WebAssembly build with keyboard and SDL gamepad support
- Bring-your-own BIOS and CUE/BIN files in the browser

Android, widescreen, higher frame rates, control remapping, and other
quality-of-life features are planned, not yet supported release targets.

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
not work. See [web/README.md](web/README.md) for browser and LAN testing notes.

To assemble the asset-free Cloudflare Pages package after building:

```sh
scripts/package-web.sh
npx wrangler pages deploy dist-web --project-name repsiman
```

The package script copies only `index.html`, the JavaScript runtime, the WASM
module, and the required Pages headers. It rejects a missing build and never
copies `.data`, BIOS, CUE, or BIN files.

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

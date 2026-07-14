# Pepsiman Recompiled

Pepsiman Recompiled is a WebAssembly-first recompilation project for the
PlayStation game *Pepsiman*. Version 1.0 runs the original game logic directly
in a modern browser and adds an optional quality-of-life layer around it.

The browser/PWA build is the primary release platform. Native builds remain
useful for framework development and debugging, but they are not maintained as
v1 product targets across macOS, Windows, and Linux.

`RepsiMan` remains the repository and Cloudflare Pages project name. The game
is published at [pepsiman.ol.mr](https://pepsiman.ol.mr) and listed on
the broader [Recomps](https://recomps.ol.mr) collection site, allowing future
games to keep independent code, releases, browser storage, and compatibility
notes.

This repository does **not** include a PlayStation BIOS, game disc, extracted
game executable, generated game code, memory cards, or save states. You must
supply legally obtained copies of the required assets yourself.

## Version 1.0

- WebAssembly browser build and installable offline PWA
- Persistent keyboard remapping, controller detection, and SDL gamepad support
- Automatic browser memory-card persistence with raw card import/export
- Persistent Original, Enhanced, and Custom QoL settings, including optional
  fast boot, 2x CD loading, low-latency input, 60 FPS smoothing, pause, and
  output filtering
- Enhanced in-level pause menu with Resume, Restart Level, Level Select, and
  Return to Title actions, plus persistent scene unlocks
- Experimental opt-in 16:9 presentation with 4:3 FMV pillarboxing
- Optional subpixel geometry correction to reduce PS1 vertex wobble and seams
- Optional perspective texture correction to reduce affine warping and swimming
- Bring-your-own BIOS and CUE/BIN files in the browser

The PWA can run in compatible Chromium-based browsers on desktop and Android.
There is no separate Android APK. Safari, Firefox, individual controller models,
fully validated widescreen gameplay, and a true higher-rate game-logic mode are
not v1 release targets.

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

The exact extraction workflow is not automated yet; the public browser build
instead asks each player for their own BIOS and disc files locally.

## Developer-only native reference build

This build is useful for runtime debugging. It is best-effort and is not one of
the maintained v1 distribution targets.

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

The **Settings** panel keeps every QoL change optional. **Enhanced** is the
default and enables conservative fast boot/loading, 60 FPS smoothing,
focus-pause, and widescreen. **Original** restores the standard boot, disc, and
4:3 presentation behavior; changing an individual switch creates a **Custom**
preset. Launch-time options are clearly marked;
pause, 60 FPS smoothing, output filtering, memory-card autosave, and
remembered-file permissions change live.
During a level, Start or the toolbar **Pause** button opens the enhanced pause
menu. Resume, Restart Level, Level Select, and Return to Title can be selected
with keyboard, mouse, or a standard gamepad. Restart and Level Select use the
game's native Free Play scene loader, and reached scenes persist in this browser.
The **60 FPS smoothing** switch inserts a presentation-only midpoint between
Pepsiman's original 30 FPS gameplay images. The guest simulation, physics,
timers, and audio remain at their original rate; this is intentionally not a
game-logic speed unlock. Smoothing adds one display frame of visual latency.
The **Widescreen** switch enables the framework's experimental 16:9 world-view
path on the next launch and is part of the Enhanced preset. Original remains
available for faithful 4:3 presentation.
The separate **Geometry correction** switch retains the GTE's discarded
subpixel projection precision and uses it only in the high-resolution visual
mirror. Native PS1 coordinates, collision, game logic, HUD, and sprites remain
unchanged; the option is off by default and applies on the next launch.
The independent **Texture correction** switch carries each GTE projection's
depth through its exact `SWC2` packet-memory store and uses that provenance for
perspective-correct UV sampling. Ordering-table submission cannot mix depths
between objects, and CPU-built UI remains on the original affine path.

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

The Pages project keeps its existing internal `repsiman` name; its public v1
custom domain is `pepsiman.ol.mr`.

The package script copies only the public shell, JavaScript runtime, WASM module,
PWA metadata/icons, social card, and required Pages headers. It rejects a
missing build and never copies `.data`, BIOS, CUE, or BIN files.

The static collection hub lives in `hub/` and deploys independently to the
`recomps` Pages project. Its game cards link to the separately deployed recomp
sites, so adding another game does not increase the hub's runtime footprint.

## Licensing and game assets

The pinned PSXRecomp framework is licensed under the PolyForm Noncommercial
License 1.0.0. Because that license restricts commercial use, this project
should currently be described as **source-available for noncommercial use**, not
as OSI-approved open-source software. This repository's original files do not yet have
an explicit license; no license is granted merely by making the repository
public.

*Pepsiman*, PlayStation, and related names and assets belong to their respective
owners. This is an unofficial preservation and engineering project and is not
affiliated with or endorsed by them.

See [PUBLICATION.md](PUBLICATION.md) before creating a public repository.

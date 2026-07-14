# Pepsiman Recompiled

Pepsiman Recompiled is a WebAssembly-first recompilation project for the
PlayStation game *Pepsiman*. Version 1.0 runs the original game logic directly
in a modern browser and adds an optional quality-of-life layer around it.

The browser/PWA build is the primary release platform. Native builds remain
useful for framework development and debugging, but they are not maintained as
v1 product targets across macOS, Windows, and Linux.

This repository does **not** include a PlayStation BIOS, game disc, extracted
game executable, generated game code, memory cards, or save states. You must
supply legally obtained copies of the required assets yourself.

Built with [PSXRecomp](https://github.com/mstan/psxrecomp).

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

Open <http://127.0.0.1:8080/Pepsiman_Recompiled.html>. Do not open the HTML file
directly; the threaded build needs the headers supplied by `web/serve.py`.

The browser build includes controller support, remapping, local saves,
remembered files, widescreen, 60 FPS smoothing, and optional QoL settings. See
[web/README.md](web/README.md) for detailed browser and LAN testing notes.

## Deploy to Cloudflare Pages

After completing the web build, authenticate Wrangler and create a Pages
project. Choose your own project name; creation is only needed once:

```sh
export CF_PAGES_PROJECT="your-project-name"
npx wrangler login
npx wrangler pages project create "$CF_PAGES_PROJECT" --production-branch main
```

Package and deploy the public browser build:

```sh
scripts/package-web.sh
npx wrangler pages deploy dist-web --project-name "$CF_PAGES_PROJECT" --branch main
```

The package script copies only the public shell, JavaScript runtime, WASM module,
PWA metadata/icons, social card, and required Pages headers. It rejects a
missing build and never copies `.data`, BIOS, CUE, or BIN files.

Add a custom domain from the Pages project's **Custom domains** settings in the
Cloudflare dashboard. Keep the generated `_headers` file: its COOP/COEP headers
are required by the threaded WebAssembly build. Maintainer-specific project and
domain details are in [PUBLICATION.md](PUBLICATION.md).

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

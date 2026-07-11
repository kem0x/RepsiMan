# Pepsiman WebAssembly build

This target runs the recompiled PS1 runtime in a browser worker, presents the
software-rendered framebuffer through an HTML canvas, and sends queued SPU audio
through Web Audio. The normal build does not contain a BIOS or game disc.

## Build

Install/activate Emscripten, then configure a release build without the native
launcher:

```sh
source "$HOME/.local/share/emsdk/emsdk_env.sh"
emcmake cmake -S . -B build-web -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DPSX_LAUNCHER=OFF \
  -DPSX_DEBUG_TOOLS=OFF
cmake --build build-web -j4
```

Serve it with the included local server:

```sh
python3 web/serve.py
```

Open <http://127.0.0.1:8080/Pepsiman_Recompiled.html>. Choose the 512 KiB PS1
BIOS, then choose the CUE and every BIN track together. Press **Start game**.
Chromium-based browsers remember permission-backed file handles in IndexedDB;
later visits restore them automatically or show **Reconnect saved files** if
permission needs to be renewed. Other browsers retain the normal per-session
file picker fallback.
The **Controls** panel supports persistent Player 1 keyboard remapping before
or during play and reports any browser-visible controller. Standard gamepads
use the normal south/east/west/north PlayStation face-button layout.

The **Saves** panel automatically persists both raw PlayStation memory cards in
IndexedDB. It can import a 128 KiB `.mcd`/`.mcr` card before launch and export
either slot at any time. Export important progress before clearing site data or
moving to a different browser profile.

The **Settings** panel stores optional QoL choices in the browser. Its
**Original** and **Enhanced** presets control fast boot, conservative 2x CD
loading, low-latency input, focus pause, and output filtering; changing any of
those switches selects **Custom**. Separate switches control memory-card
autosave and remembered game-file handles. Options labelled **Next launch** are
written into the generated runtime configuration when the game starts. The
toolbar **Pause** button freezes the guest at a frame boundary and resumes it
without advancing the game in the background.

The optional **Widescreen** switch selects the framework's experimental 16:9
world-view path while keeping BIOS screens and FMVs at their original 4:3
aspect. It currently requires visual validation across the whole game and is
not part of the Enhanced preset.

The custom server is required: browser pthreads need the COOP/COEP headers it
adds. Opening the HTML file directly with `file://` will not work.

## Private automated test build

For local development only, the linker can preload `SCPH1001.bin` and the
`PEPSIMAN/` directory from the project root:

```sh
emcmake cmake -S . -B build-web -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DPSX_LAUNCHER=OFF \
  -DPSX_DEBUG_TOOLS=OFF \
  -DPEPSIMAN_WEB_PRELOAD_TEST_ASSETS=ON
cmake --build build-web -j4
```

Then open the page with `?preloaded-test-assets`. This produces a roughly
207 MiB `.data` file containing copyrighted assets. Never distribute it; switch
the option back off before making a package.

## Test from another device on the LAN

The server can expose only the local BIOS and Pepsiman CUE/BIN files behind a
random URL token. Because the runtime uses browser threads, a phone must trust
the HTTPS certificate; plain `http://<mac-ip>` is insufficient.

```sh
python3 web/serve.py --host 0.0.0.0 --port 8443 \
  --assets-dir . --cert web/certs/server.crt --key web/certs/server.key
```

Open the printed tokenized URL on the phone. This mode does not bundle assets
into the build, but it transfers the complete disc from the Mac for each page
load. Keep it on a trusted private network and stop the server after testing.

## Current MVP limitations

- Tested in a Chromium-based browser on macOS. Other desktop browsers still
  need validation.
- The complete disc is retained in browser-managed memory for each session.
  Range-backed/streaming disc access is the next major web optimization; disc
  tracks no longer consume the WASM gameplay heap.
- Memory cards persist per browser origin. Cross-browser or cross-device
  transfer currently requires manual export/import.
- Presentation defaults to the faithful 4:3 software path. Experimental 16:9
  is available; WebGL, higher internal resolutions, and game-wide widescreen
  validation remain later work.
- Keyboard remapping and SDL's browser gamepad path are available. Individual
  controller models still need hands-on mapping tests.

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
- Memory cards currently live in temporary MEMFS and are lost on reload.
- Presentation is the faithful 4:3 software path. WebGL, widescreen, and higher
  internal resolutions are later enhancements.
- Keyboard remapping and SDL's browser gamepad path are available. Individual
  controller models still need hands-on mapping tests.

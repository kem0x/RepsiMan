# Pepsiman WebAssembly build

This target runs the recompiled PS1 runtime in a browser worker, presents the
software-rendered framebuffer through an HTML canvas, and sends queued SPU audio
through Web Audio. It is the primary Pepsiman Recompiled v1 release target. The
normal build does not contain a BIOS or game disc.

Built with [PSXRecomp](https://github.com/mstan/psxrecomp).

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

The packaged browser build is also an installable offline PWA. Its service
worker caches only the public HTML, JavaScript, WebAssembly, manifest, and icon
files. BIOS and disc files are never cached; installed sessions continue to use
the user's local files or remembered file handles.

The **Settings** panel stores optional QoL choices in the browser. **Enhanced**
is the fresh-install default and enables fast boot, conservative 2x CD loading,
low-latency input, 60 FPS smoothing, focus pause, and widescreen. **Original**
restores the standard boot, loading, and 4:3 presentation behavior; changing an
individual switch selects **Custom**. Separate switches control
memory-card autosave and remembered game-file handles. Options
labelled **Next launch** are written into the generated runtime configuration
when the game starts. The
toolbar **Pause** button (or Start during a level) opens an enhanced menu and
freezes the guest at a frame boundary without advancing it in the background.
The menu supports Resume, Restart Level, Level Select, and Return to Title with
keyboard, mouse, or a standard gamepad. Restart and Level Select use Pepsiman's
native Free Play scene loader. Level Select begins with Stage 1 Scene 1 and
unlocks each following scene as it is completed; those unlocks persist in this
browser separately from the original memory card. Finishing a replay returns
to the enhanced picker with the newly reached scene available. Normal campaign
scene transitions also unlock exactly the next scene.

The live **60 FPS smoothing** option detects Pepsiman's original repeated
30 FPS gameplay images and uses the spare vblank to show a temporal midpoint.
It does not alter the guest simulation, physics, timers, or audio. FMVs and
already-60 Hz content stay on their original presentation path. Smoothing adds
one display frame of visual latency.

The **Widescreen** switch selects the framework's experimental 16:9 world-view
path while keeping BIOS screens and FMVs at their original 4:3 aspect. It is
part of the Enhanced preset; Original switches presentation back to faithful
4:3.

The optional **Geometry correction** switch renders GTE-matched 3D polygons
with retained subpixel projection precision in a 2x internal surface. It is a
visual-only, next-launch option: native PS1 coordinates, collision, game logic,
HUD, and sprites remain unchanged. It is off by default while each scene is
validated for mismatched or missing polygons.

The independent **Texture correction** switch records projection depth when an
SXY register is stored into the exact GPU packet address with `SWC2`, then
recovers it from that same address during DMA submission. This preserves depth
through ordering-table reordering and avoids coordinate-based cross-object
matches. CPU-built screen-space UI and sprites continue through the original
affine path.

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

Append `&mute-test-audio` to a private test URL to force SDL's dummy audio
driver. Use this for automated capture and regression work that must remain
silent; it is not exposed in the public settings UI.

Private test pages also expose held Start and Japanese Confirm/Circle inputs.
Unlike synthetic browser taps, these hooks remain active across Pepsiman's 30 Hz
controller sampling window and are suitable for deterministic menu automation.
**Test Stage 1** exercises the same native Free Play transition used by Restart
and Level Select and waits for the runtime's explicit level-action completion
signal.

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

- Tested in a Chromium-based browser on macOS. Compatible Chromium-based Android
  browsers are the mobile route; there is no separately maintained Android APK.
  Safari, Firefox, and other desktop browsers still need validation.
- The complete disc is retained in browser-managed memory for each session.
  Range-backed/streaming disc access is the next major web optimization; disc
  tracks no longer consume the WASM gameplay heap.
- Memory cards persist per browser origin. Cross-browser or cross-device
  transfer currently requires manual export/import.
- Level-select unlocks are device-local browser data and currently have no
  import/export format.
- Enhanced defaults to the experimental 16:9 software path; Original restores
  faithful 4:3. Optional geometry and texture correction are available; WebGL,
  more internal scale choices, and game-wide visual validation remain later work.
- Keyboard remapping and SDL's browser gamepad path are available. Individual
  controller models still need hands-on mapping tests.

Native builds remain available to framework developers as a debugging/reference
path. They are not maintained as v1 end-user targets across desktop platforms.

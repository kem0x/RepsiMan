# Pepsiman Recompiled v1.0.0

Pepsiman Recompiled v1.0 is the first WebAssembly-first release of the project.
It runs the original PlayStation game logic in a modern browser while keeping
the player's legally obtained BIOS, disc, and memory-card data local.

## Highlights

- Asset-free, threaded WebAssembly build and installable offline PWA shell
- Enhanced 16:9 presentation enabled by default, with faithful 4:3 available
- Presentation-only 60 FPS smoothing without speeding up physics, timers, or audio
- Keyboard remapping and browser-visible standard gamepad support
- Automatic two-slot memory-card persistence with raw card import/export
- Remembered local BIOS and disc permission handles on supported browsers
- Enhanced pause menu with Resume, Restart Level, Level Select, and Return to Title
- Persistent per-scene unlock tracking for replay and practice
- Optional faster boot/loading, unlimited lives, geometry correction, texture
  correction, focus pause, and output filtering

## Platform policy

The maintained v1 product is the browser/PWA build. Compatible Chromium-based
browsers are the primary desktop and Android route; there is no separate Android
APK. Native builds remain available for framework development and debugging but
are not maintained as end-user releases across desktop operating systems.

## Requirements

- A browser with WebAssembly threads, SharedArrayBuffer, Web Audio, and Gamepad API support
- A legally obtained 512 KiB PlayStation BIOS
- A legally obtained Pepsiman CUE file and every referenced BIN track

The distributed package does not include copyrighted game or BIOS assets.

## Known limitations

- Chromium on macOS is the primary exercised v1 browser configuration.
- Safari, Firefox, individual Android devices, and controller models need broader testing.
- Full-campaign CD-audio looping and later-stage enhancement compatibility need
  a final manual regression pass before the release tag.
- Widescreen, geometry correction, and texture correction remain optional visual enhancements.
- The disc is retained in browser-managed memory for the active session.
- Browser saves, settings, file permissions, and level unlocks are scoped to one web origin.
- 60 FPS mode smooths presentation; it does not raise the game's simulation rate.

## Project status

The framework is distributed under the PolyForm Noncommercial License 1.0.0.
This release is source-available for noncommercial use, not OSI-approved open
source. Pepsiman, PlayStation, and related properties belong to their respective
owners. This is an unofficial preservation and engineering project.

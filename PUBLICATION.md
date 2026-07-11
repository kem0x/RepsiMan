# Publication checklist

The source project and the personal website should remain separate repositories.
The website should contain only a tested browser release; development history,
build scripts, and runtime code belong here.

## Repository boundary

- `kem0x/RepsiMan` contains the game-specific configuration, build glue, web
  shell, and documentation.
- `kem0x/psxrecomp` contains the framework/runtime work. The RepsiMan submodule
  pins the tested commit on the fork's compatibility branch.
- The Cloudflare Pages project receives only the output of
  `scripts/package-web.sh`; it is independent of the personal-site repository.

Before each release, regenerate the ignored game C output from a user-owned
extraction, rebuild locally, package the browser files, and audit the result.

Useful checks:

```sh
git status --short --ignored
git ls-files
git -C psxrecomp status --short
find build-web -maxdepth 1 -type f -print
```

The public browser package must contain only:

```text
Pepsiman_Recompiled.html
Pepsiman_Recompiled.js
Pepsiman_Recompiled.wasm
```

Never publish `Pepsiman_Recompiled.data`; private test builds use it to bundle
the BIOS and disc. Also exclude all BIOS files, CUE/BIN tracks, extracted game
files, memory cards, saves, crash dumps, TLS private keys, and local settings.

## Repository layout

- `kem0x/RepsiMan`: this game-specific project and its release workflow.
- `kem0x/psxrecomp`: the framework fork containing the runtime changes.
- `kem0x/olmr`: the personal website, which remains unchanged by RepsiMan
  releases.

RepsiMan deploys to its own Cloudflare Pages project and custom domain. This
keeps large WASM updates out of the personal website's Git history and lets
releases be versioned independently.

## Legal review point

The generated native/WASM output contains translated game logic even when it
does not contain the disc image. Before distributing a public build, review the
legal position for the relevant jurisdiction and the project's intended scope.
This checklist is engineering guidance, not legal advice.

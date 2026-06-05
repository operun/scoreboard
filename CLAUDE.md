# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Electron desktop app for live control of videowalls/scoreboards at sports events (TSV 1880 Wasserburg). It runs **two windows**: a **Controller** window for the operator and a frameless **Output** window captured by the videowall hardware. React + Vite renders both; they are the same bundle differentiated by URL hash (`#/output`).

## Commands

```bash
npm run start            # Dev: Vite dev server + Electron with hot reload (concurrently)
npm run dev              # Vite dev server only (renderer at http://localhost:5173)
npm run electron         # Electron only via electronmon (expects Vite already running)
npm run build            # Full production build: vite build → electron-builder
npm run build:renderer   # vite build → dist/
npm run build:electron   # electron-builder → dist-electron/
npm run release          # Interactive release.sh: bumps version, commits, tags, pushes
npm run generate:icons   # Regenerate icon set from src/assets/icons/icon.png
```

There is **no test suite, linter, or typecheck** configured. The codebase is plain JS/JSX (no TypeScript despite older notes suggesting otherwise).

Releases are driven by `release.sh` (must be on `main`, clean tree). Pushing a `vX.Y.Z` tag triggers GitHub Actions to build the Windows NSIS installer and publish a GitHub Release. The README's `release:patch/minor/major` scripts do not exist — use `npm run release` (interactive bump).

## Architecture

### Process model & IPC
- **`main.js`** — Electron main process. Owns ALL file I/O, SSH, window lifecycle, and event routing. Every `ipcMain.handle('...')` here has a matching wrapper in `preload.js`.
- **`preload.js`** — context bridge. Exposes `window.electronAPI.*` to the renderer (contextIsolation on, nodeIntegration off). Adding any renderer↔main capability means editing **both** `main.js` (handler) and `preload.js` (bridge).
- **`src/App.jsx`** — single React entry for both windows. `window.location.hash === '#/output'` selects the Output UI; otherwise the Controller shell (TitleBar + Sidebar + view switching) renders. View routing is plain `useState`, not a router. `ControllerView` stays mounted (hidden via `display`) so game state survives navigation.

### Controller → Output communication (the core pattern)
The Controller never talks to Output directly. It sends a **named control command** through main, which **broadcasts to every window**:

```
ControllerView ──electronAPI.sendControlCommand(CMD, payload)──► main.js
   main.js ──webContents.send('control-command', {command, payload})──► ALL windows
      OutputView dispatches on `command` (a chain of `if (command === ...)`)
```

Commands are string constants such as `UPDATE_GAME_STATE`, `SET_TEAM_LOGOS`, `PLAY_PLAYLIST`, `SHOW_SCENE`, `SHOW_SCOREBOARD`, `SHOW_ANNOUNCEMENT`, `SHOW_SUBSTITUTION`, `SHOW_CARD`, `STOP_OUTPUT`. To add a behavior: emit it from `ControllerView.jsx` and handle it in `OutputView.jsx`. Because the broadcast also reaches the Controller, the Controller can render a live **preview** of Output (`<OutputView preview />`). `REQUEST_SYNC`/`SYNC_STATUS` let a newly opened window pull current state.

### Output scenes
`OutputView.jsx` holds all output state (game state, timer, active media, logos, current scene) and composes scene components from `src/components/output/`: `PlaylistScene`, `ScoreboardScene`, `AnnouncementScene`, `SubstitutionScene`, `CardScene`. Scenes are presentational; OutputView decides which is visible and feeds props.

### Data & persistence
All state is local JSON in Electron's `userData` dir (`%APPDATA%\Scoreboard` on Windows, `~/Library/Application Support/Scoreboard` on macOS):
- `settings.json`, `media.json`, `playlists.json`, `presets.json`
- `media/` — imported image/video files (copied in, hashed for dedupe, thumbnails generated)
- `custom_test_image.png`, `id_ed25519`(+`.pub`) SSH keypair

`settingsStore.js` is the settings read/write helper (named `*EncryptedSettings` for legacy reasons — it is **plain JSON**, not encrypted). After persisting changes, main pushes `settings-updated` / `playlists-updated` / `media-updated` events so all windows refresh.

### SSH sync
`sync-to-remote` in `main.js` does a **bidirectional** merge with a remote host over SSH (`ssh2`): it reads remote `*.json`, merges with local, writes back, and transfers media files. Remote base dir is `scoreboard`. Host/user come from settings; the keypair is generated in-app (Settings → Sync).

### Media / ffmpeg
`fluent-ffmpeg` + `ffprobe-static` generate video thumbnails and probe media. `afterPack.js` is an electron-builder hook that **swaps the bundled Electron libffmpeg for the Chromium-branded build** (matching the exact Electron version) so packaged builds have H.264/AAC support. `ffprobe-static` is `asarUnpack`ed so its binary is reachable at runtime.

## Working Conventions

These are authoritative project rules.

### Documentation
- **No emojis** in `README.md`, `CHANGELOG.md`, or any other docs. Keep the tone professional and clean.
- **Language**:
  - Code comments and variable names: **English**.
  - Documentation and commit messages: **English** (Conventional Commits).
  - **Changelog: German** (user-facing UI strings are German too).

### Critical feedback & decision making
- **Do not always agree.** Critically question decisions, architectural drafts, and implementation plans.
- **Risk assessment**: actively name potential weaknesses, scaling issues, performance bottlenecks, and unclean dependencies in proposed solutions.
- **Summary before implementation**: for complex changes (e.g. data-model adjustments, IPC/API redesign) present a summary of the planned procedure before implementing, to avoid wasted iterations.

### Coding standards
- **UI**: use Bootstrap 5 components/utility classes wherever possible. The dependency is `bootstrap` (CSS classes used directly in JSX) — *not* react-bootstrap.
- Components are **functional**.
- Keep code **as simple as possible**; flag it if data needs cleaning (e.g. stale JSON in `userData`).

### Process management
- **Never auto-kill or restart processes** (no `pkill`, `killall`, service restarts). If a restart is needed, give the user **clear manual instructions** (e.g. "stop Vite with Ctrl+C, then run `npm run dev`"). Rationale: avoid zombie processes and keep the user in control.

### File management
- **No backup files** (`.bak`, `.old`) when modifying files — rely on git for version control.

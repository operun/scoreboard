# Implementation Plan: Reliable Video Preview Thumbnails

Status: Draft (analysis confirmed in code, implementation not started)
Date: 2026-07-24

## Problem

Users report missing preview images for uploaded videos. Thumbnail generation
is implemented, but it silently fails on machines without a system-wide ffmpeg
installation (typically the production Windows machines), and thumbnails are
not transferred by the SSH sync.

## Current behavior

1. **Generation on import** (`add-media`, `main.js:344-374`): for videos, a
   160x90 JPEG is captured at second 1 via `fluent-ffmpeg` and stored in
   `media/thumbnails/<id>.jpg` inside the userData directory. The list view
   (`MediaView.jsx`) and the playlist editor (`EditPlaylistView.jsx`) display
   it. Images do not need a thumbnail; the original file is shown directly.
2. **Root cause 1 — ffmpeg binary is not bundled**: only `ffprobe-static` is a
   dependency, which ships `ffprobe` (metadata probing) but not `ffmpeg`.
   `setFfmpegPath` is never called, so `fluent-ffmpeg` spawns `ffmpeg` from the
   system PATH for screenshot capture. This works on the dev Mac (Homebrew
   ffmpeg) and fails silently on Windows machines without ffmpeg: the error
   handler only logs a warning and the video is imported without a thumbnail.
   Note: the `afterPack.js` libffmpeg swap is unrelated; that is Chromium's
   playback library, not a CLI binary.
3. **Root cause 2 — SSH sync skips thumbnails**: `sync-to-remote` transfers
   media files and the merged JSON, but not the `media/thumbnails/` directory.
   Since `thumbnailStoredName` is part of the merged `media.json`, the target
   machine renders a dead `file://` URL (broken image) instead of a fallback.
4. **No backfill**: the migration loop in `load-media` (`main.js:239-264`)
   enriches missing video durations but never regenerates missing thumbnails.
   Videos imported while ffmpeg was unavailable stay without a preview forever.

## Plan

### Step 1: Bundle ffmpeg

- Add `ffmpeg-static` as a dependency.
- In `main.js`, resolve its path with the same ASAR remapping used for
  `ffprobe-static` (`main.js:27-35`) and call `ffmpeg.setFfmpegPath(...)`
  wherever `fluent-ffmpeg` is set up.
- Add `node_modules/ffmpeg-static/**` to `build.asarUnpack` in `package.json`
  (same pattern as `ffprobe-static`).
- Trade-off: the Windows installer grows by roughly 60-80 MB (unpacked ffmpeg
  binary). Alternative considered: generating thumbnails in the renderer via a
  hidden `<video>` element plus canvas capture (H.264 decoding is available
  thanks to the libffmpeg swap), which avoids the binary entirely but adds an
  IPC round trip and couples import to a running renderer. Recommendation:
  `ffmpeg-static`, because it works entirely in the main process, matches the
  existing ffprobe pattern, and keeps `add-media` self-contained.

### Step 2: Backfill missing thumbnails

- Extend the migration loop in `load-media`: for videos without
  `thumbnailStoredName` (or whose thumbnail file is missing on disk), attempt
  generation sequentially, then persist via `saveMediaList`.
- Guard against retry storms: track failed attempts in an in-memory set so a
  permanently broken video is only retried once per app session.
- Effect: existing videos on the affected Windows machines get their previews
  automatically the next time the media list is loaded.

### Step 3: Transfer thumbnails during SSH sync

- Include `media/thumbnails/` in `sync-to-remote`, using the same
  missing-file transfer logic as for media files (both directions).
- Optional UI hardening: add an `onError` fallback to the thumbnail `<img>` in
  `MediaView.jsx` and `EditPlaylistView.jsx` so a dead path renders the
  type icon instead of a broken image.

## Affected files

- `package.json` (dependency, `asarUnpack`)
- `main.js` (ffmpeg path setup, `add-media`, `load-media` backfill,
  `sync-to-remote`)
- `src/MediaView.jsx`, `src/EditPlaylistView.jsx` (optional fallback only)

## Verification

1. Dev: import a video, confirm the thumbnail appears and that the resolved
   `ffmpeg-static` path is logged/used (not the Homebrew binary).
2. Packaged Windows build on a machine without ffmpeg: import a video and
   confirm the thumbnail appears; open the media view and confirm existing
   videos are backfilled.
3. Sync: run a sync and confirm thumbnails exist on the target machine.

## Notes

- `npmRebuild` is `false`; `ffmpeg-static` downloads a prebuilt binary at
  install time and needs no native build step, so this stays compatible.
- Add a German changelog entry under `[Unreleased]` once implemented.

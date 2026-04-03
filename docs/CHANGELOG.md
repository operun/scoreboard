# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated SSH key submission via email from the settings UI
- IPC broadcast events for real-time playlist and media synchronization across windows
- Granular reset options: reset settings, reset media, reset app

### Changed
- Media file paths are now converted to valid `file://` URLs in the main process using `pathToFileURL`, fixing broken image display on Windows
- Settings are stored as plain JSON — encryption removed since no sensitive credentials are stored

### Fixed
- Image and video previews not rendering in output and controller views on Windows

## [1.1.3] - 2026-04-03

### Changed
- SSH key comment now uses the configured sync user instead of a hardcoded value

## [1.1.2] - 2026-03-30

### Fixed
- Build crash on Windows CI caused by writing to a stream after redirect resolution (`write-after-end` error in `afterPack.js`)

## [1.1.1] - 2026-03-30

### Fixed
- GitHub Actions release workflow not uploading installer due to missing `owner`, `repo` and `releaseType` in electron-builder publish config

## [1.1.0] - 2026-03-30

### Added
- Sync server and user are now configurable via the settings UI
- Recursive remote directory creation during SSH sync

### Fixed
- GitHub Actions release workflow not uploading installer artifact
- Controller visibility settings not persisting correctly across view changes

## [1.0.5] - 2026-03-28

### Fixed
- GitHub Actions release workflow uploading incorrect artifacts

## [1.0.4] - 2026-03-28

### Added
- Automated release script (`npm run release`)

## [1.0.3] - 2026-03-28

### Added
- SSH key pair authentication replaces password-based login for sync

### Fixed
- App crash on startup on Windows with native modules
- ControllerView state lost on tab switch (now uses visibility toggle instead of unmount)

## [1.0.2] - 2026-03-27

### Fixed
- GitHub Actions build pipeline: Node.js 24 compatibility, artifact path, electron-builder publish mode

## [1.0.1] - 2026-03-27

### Added
- GitHub Actions workflow for automated Windows builds and releases
- npm release scripts (`npm run release:patch`, `release:minor`, `release:major`)

## [1.0.0] - 2026-03-26

Initial release.

### Added
- Dual-window layout: controller window and frameless output window
- Media management: import images and videos, automatic video thumbnails
- Playlist editor with configurable image durations
- Live controller: play playlists, switch scenes, control scoreboard overlay
- Scoreboard with score, timer, team logos, and sponsor display
- Event overlays: substitution, yellow/red card, announcement, overtime
- SSH sync: push media and playlists to a remote installation
- Settings: output resolution, appearance, visibility toggles, test image upload
- Dark mode support
- Custom frameless title bar with window controls
- Proprietary codec support (H.264/AAC) via Chromium ffmpeg replacement

[Unreleased]: https://github.com/operun/scoreboard/compare/v1.1.3...HEAD
[1.1.3]: https://github.com/operun/scoreboard/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/operun/scoreboard/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/operun/scoreboard/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/operun/scoreboard/compare/v1.0.5...v1.1.0
[1.0.5]: https://github.com/operun/scoreboard/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/operun/scoreboard/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/operun/scoreboard/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/operun/scoreboard/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/operun/scoreboard/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/operun/scoreboard/releases/tag/v1.0.0

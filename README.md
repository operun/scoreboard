# Scoreboard

Electron-Desktop-App zur Live-Steuerung von Videowalls und Anzeigetafeln bei Sportveranstaltungen. Entwickelt für den TSV 1880 Wasserburg.

---

## Features

- **Medienverwaltung** — Bilder und Videos importieren, Thumbnails automatisch generiert
- **Playlist-Editor** — Abfolgen mit konfigurierbaren Standzeiten erstellen
- **Live-Regie** — Playlisten abspielen, Szenen wechseln, Scoreboard einblenden
- **Scoreboard** — Spielstand, Timer, Team-Logos, Sponsor
- **Ereignis-Overlays** — Einwechslung, Karten, Durchsagen direkt aus der Regie
- **SSH-Sync** — Medien und Playlisten auf entfernte Installation synchronisieren
- **Dual-Window** — Controller-Fenster für den Operator, Output-Fenster für die Videowall

---

## Architektur

```
┌─────────────────────────┐        ┌─────────────────────┐
│   Controller Window      │  IPC   │    Output Window    │
│   (React / Vite)         │◄──────►│    (React / Vite)   │
│   Settings, Media,       │        │    Vollbild, kein UI │
│   Playlists, Regie       │        │    für Videowall     │
└──────────┬──────────────┘        └─────────────────────┘
           │ IPC
           ▼
┌─────────────────────────┐
│   Electron Main Process  │
│   File IO · SSH · IPC    │
└──────────┬──────────────┘
           │
           ▼
     userData (JSON + Media)
```

**Stack:** Electron · React 19 · Vite · Bootstrap 5 · ssh2 · fluent-ffmpeg

---

## Entwicklung

```bash
npm install
npm run start
```

---

## Build

```bash
npm run build
```

Erstellt den Windows-Installer unter `dist-electron/`. Der Build-Prozess ersetzt automatisch die Standard-ffmpeg-Library durch eine Chromium-Variante mit H.264/AAC-Unterstützung.

→ Details: [docs/build.md](docs/build.md)

---

## Release

Releases werden automatisch über GitHub Actions ausgelöst:

```bash
git tag v1.2.0
git push origin v1.2.0
```

Der Workflow baut die App, erstellt ein GitHub Release und lädt den Installer hoch.

---

## Konfiguration

Die App speichert alle Daten in `userData` (plattformspezifisch):

| Pfad | Inhalt |
|------|--------|
| `settings.json` | Sync-Host, UI-Einstellungen |
| `media.json` | Medien-Index |
| `playlists.json` | Playlist-Definitionen |
| `presets.json` | Spielkonfigurationen |
| `id_ed25519` | SSH-Schlüssel für Sync-Authentifizierung |

---

## Lizenz

Proprietär · TSV 1880 Wasserburg / operun

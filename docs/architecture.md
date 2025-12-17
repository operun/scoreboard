# Architektur-Dokumentation: Scoreboard (TSV 1880 Wasserburg)

## 1. Systemüberblick
Die "Scoreboard"-Anwendung ist eine Desktop-App (Electron), die für den Betrieb von Anzeigetafeln/Videowalls bei Sportveranstaltungen konzipiert ist. Sie dient zwei Hauptzwecken:
1. **Vorbereitung (Preparer)**: Verwaltung von Medien und Erstellung von Playlisten.
2. **Live-Betrieb (Operator)**: Steuerung der Anzeige in Echtzeit ("Regie"), Abspielen von Playlisten und sofortiges Einspielen von Ereignis-Videos (z.B. "Tor").

Das System folgt einer **Dual-Window-Architektur**:
- **Control Window (Hauptfenster)**: Die Benutzeroberfläche für den Operator (Medienverwaltung, Playlist-Editor, Regie-Pult).
- **Output Window (Zweitfenster)**: Ein rahmenloses Vollbild-Fenster, das den reinen Content (Video/Bild) ohne UI-Elemente rendert. Dieses Fenster wird von der Videowall-Software/Hardware abgegriffen.

## 2. Technische Architektur

### 2.1 Stack
- **Core**: Electron (Main Process für Fenster-Management, Datei-IO, IPC).
- **Renderer**: React 19 + Vite.
- **State Management**: React State + IPC Events für Sync zwischen Fenstern.
- **Styling**: Bootstrap 5 + SCSS.
- **Daten**: Lokales Filesystem (JSON).

### 2.2 Datenfluss & Kommunikation
```mermaid
graph TD
    User[Operator] -->|Klickt| ControllerView[Control Window (React)]
    ControllerView -->|IPC: 'cmd-play-media'| Main[Electron Main Process]
    Main -->|IPC: 'update-output'| OutputView[Output Window (React)]
    
    OutputView -->|Renders| Video[HTML5 Video / Image]
    
    Main -->|File IO| FS[(JSON DB & Media Files)]
```

- **IPC Kanäle**:
  - `control-channel`: Befehle vom Controller an Main (z.B. PLAY, STOP, OVERRIDE).
  - `status-channel`: Rückmeldung vom Output an Controller (z.B. Timeupdate, Ended).

### 2.3 Datenstruktur
- **media.json**: Liste aller importierten Dateien mit Metadaten (Hash, Pfad, Typ).
- **playlists.json**: Definitionen von Abfolgen.
  - Struktur: `{ id, title, items: [{id, duration, ...}] }`

## 3. Module & Komponenten

### 3.1 Main Process (`main.js`)
- **WindowManager**: Verwaltet zwei `BrowserWindow` Instanzen.
  - `mainWindow`: Interaktiv, mit Frame.
  - `outputWindow`: "Clean feed", evtl. auf sekundärem Display, kein Frame.
- **MediaManager**: CRUD für Dateien.
- **SyncManager (Geplant)**: SSH-Sync Logik (Push von Medien/Playlisten auf Operator-PC).

### 3.2 Renderer Process (Views)

#### A. Verwaltungs-Views
1. **MediaView**: Upload/Verwaltung von Rohdaten.
2. **PlaylistsView / EditPlaylistView**:
   - Zusammenstellen von Sequenzen.
   - Definieren von Standzeiten für Bilder.

#### B. ControllerView (Live-Regie)
Das Herzstück für den Live-Betrieb.
- **Active Playlist Zone**: Zeigt aktuelle Playlist an, Highlight auf aktivem Element. Buttons für Play/Pause/Next.
- **Instant Actions (Overrides)**: Globale Buttons (Grid) für Sofort-Ereignisse (Tor-Animation, Werbung, Foul).
  - Logik: Unterbricht aktuelle Playlist -> Spielt Clip -> Kehrt zurück (oder stoppt).
- **Preview**: (Optional) Kleines Vorschaufenster, was gerade auf dem Output läuft.

#### C. OutputView (Neues Fenster)
- Minimalistische Route (z.B. `#/output`).
- Hört auf IPC Events um Content zu wechseln.
- Kein UI Overlap.

## 4. Workflows

### 4.1 Sync-Workflow (Zukunft)
1. **Preparer** erstellt Playlist zuhause.
2. Verbindet sich via SSH Settings mit **Operator-PC**.
3. Diff-Check: Welche Dateien fehlen drüben?
4. SCP Transfer der Media-Files + Update der JSONs.

### 4.2 Live-Workflow
1. Operator öffnet App -> Output-Fenster öffnet sich automatisch (z.B. auf Screen 2).
2. Operator lädt "Halbzeit-Playlist".
3. Klick auf "Play" -> 1. Element erscheint auf Output.
4. Ereignis "Tor": Operator drückt "TOR"-Button.
   - Output stoppt Playlist sofort.
   - Output spielt "tor.mp4".
   - Nach Ende: Output zeigt Schwarzbild oder letzten Frame (konfigurierbar).

### 4.3 Zukünftige Erweiterungen
Für Konzepte zur Entkopplung (WebSockets) und robusterem Datentransfer (Project Bundles) siehe [Future Roadmap](roadmap.md).

# Zukunftsplanung / Skalierung

## Entkopplung durch Client-Server Architektur
Aktuell kommunizieren Controller- und Output-Fenster über Electron IPC Kanäle. Dies limitiert das System auf eine lokale Ausführung (Single-Machine). Für professionelle Szenarien (Regie am Spielfeldrand, Player an der Videowall im Technikraum) ist eine Aufsplittung sinnvoll.

### Ziel-Architektur
Ersetzen der direkten IPC Calls durch eine **WebSocket-basierte Kommunikation**.

```mermaid
graph TD
    subgraph "Player PC (Videowall)"
        ElectronApp[Electron Main Process]
        WSServer[WebSocket Server (Port 8080)]
        OutputView[Output Window (Web Client)]
    end

    subgraph "Regie Laptop / Tablet"
        ControllerBrowser[Browser / iPad]
    end

    ElectronApp -- Startet --> WSServer
    OutputView -- ws://localhost:8080 --> WSServer
    ControllerBrowser -- ws://IP-ADRESSE:8080 --> WSServer

    ControllerBrowser -- "CMD: PLAY_MEDIA" --> WSServer
    WSServer -- "Broadcast: PLAY_MEDIA" --> OutputView
```

### Vorteile
1.  **Ortsunabhängigkeit**: Der Controller kann auf jedem Gerät im selben Netzwerk laufen (Laptop, Tablet, Smartphone).
2.  **Skalierbarkeit**: Ein Controller könnte mehrere Outputs (z.B. Videowall + VIP-Bereich Screens) synchron steuern.

---

## Alternative Datenhaltung: Project Bundles
Anstatt Dateien einzeln per SSH zu synchronisieren (anfällig für Netzwerkprobleme/Pfade), soll ein container-basiertes Format eingeführt werden.

### Konzept: `.sbp` (Scoreboard Project)
Ein ZIP-Archiv mit definierter Struktur:
```text
project.sbp (zip)
├── manifest.json  (Metadaten)
├── playlists.json (Struktur)
└── assets/
    ├── intro.mp4
    ├── tor.mp4
    └── ...
```

### Workflow
1.  **Vorproduktion**: Erstellung zuhause am PC.
2.  **Export**: "Save as Package..." -> Erzeugt ZIP.
3.  **Transfer**: Via USB-Stick oder Cloud auf den Stadion-PC.
4.  **Import**: Stadion-PC lädt das Paket, entpackt es temporär und ist 100% offline-fähig einsatzbereit.

Dies eliminiert Abhängigkeiten von Netzwerkfreigaben oder komplexen rsync/SSH Scripten.

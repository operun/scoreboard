# Build-Anleitung: Windows 11 (x64)

> Stand: März 2026 · Electron 40.x · electron-builder 26.x · Node.js 24.x (Active LTS)

---

## Voraussetzungen

### 1. Node.js 24 installieren

Node.js 24 ist seit Oktober 2025 der **Active LTS** — die empfohlene Version für neue Setups. Node.js 22 (Maintenance LTS) funktioniert ebenfalls als Minimum.

1. [https://nodejs.org](https://nodejs.org) → **LTS** (24.x) für Windows herunterladen
2. Installer ausführen, alle Optionen auf Standard lassen
3. Prüfen im Terminal:
   ```
   node --version   # v24.x.x
   npm --version    # 11.x.x
   ```

### 2. Git installieren

```
https://git-scm.com/download/win
```

Standard-Installation, „Git Bash" als Terminal reicht.

### 3. Visual Studio Build Tools installieren

electron-builder und native Node-Module (z.B. `sharp`, `ssh2`) benötigen die Windows Build Tools.

1. [https://visualstudio.microsoft.com/de/visual-cpp-build-tools/](https://visualstudio.microsoft.com/de/visual-cpp-build-tools/) herunterladen
2. Installer starten → **"Desktop-Entwicklung mit C++"** auswählen
3. Installieren (ca. 4–6 GB, dauert einige Minuten)

> [!IMPORTANT]
> Ohne diese Tools schlägt `npm install` bei nativen Modulen fehl.

### 4. Python installieren (optional, aber empfohlen)

Einige native Module nutzen `node-gyp`, das Python benötigt.

```
https://www.python.org/downloads/windows/
```

Beim Installer **"Add Python to PATH"** aktivieren.

---

## Projekt einrichten

### Schritt 1: Repository klonen

```bash
git clone <repo-url> scoreboard
cd scoreboard
```

### Schritt 2: Dependencies installieren

```bash
npm install
```

> [!NOTE]
> `npm install` kann auf Windows 2–5 Minuten dauern, da native Module (sharp, ssh2) kompiliert werden.

**Falls Fehler auftreten:**
```bash
npm install --ignore-scripts   # Temporär für Diagnose
```

### Schritt 3: Dev-Modus testen (optional)

```bash
npm run start
```

Die App sollte starten. Wenn das funktioniert, ist die Umgebung korrekt.

---

## Build erstellen

### Schritt 4: Renderer bauen

```bash
npm run build:renderer
```

Erstellt den Vite-Build in `dist/`. Sollte in unter 30 Sekunden abgeschlossen sein.

**Prüfen:**
```
dist/
  index.html
  assets/
    ...
```

### Schritt 5: Electron-App bauen

```bash
npm run build:electron
```

Oder beides in einem Schritt:
```bash
npm run build
```

### Ausgabe

Der Build landet in `dist-electron/`:
```
dist-electron/
  Scoreboard Setup 1.0.0.exe    ← NSIS-Installer
  win-unpacked/                 ← Entpackte App (zum direkten Testen)
    Scoreboard.exe
    ...
```

---

## Installieren & Testen

### Option A: Installer ausführen

```
Scoreboard Setup 1.0.0.exe
```

Installiert die App unter `C:\Users\<Name>\AppData\Local\Programs\Scoreboard\`.

### Option B: Direkt ohne Installation starten

```
dist-electron\win-unpacked\Scoreboard.exe
```

> [!TIP]
> Zum schnellen Testen reicht Option B — kein Installer nötig.

---

## Bekannte Stolperstellen

### `ffprobe-static` im ASAR-Archiv

**Problem:** Electron packt alles in ein `app.asar`-Archiv. Binaries (wie `ffprobe.exe`) können nicht direkt aus einem Archiv ausgeführt werden → Runtime-Fehler.

**Lösung:** Bereits konfiguriert in `package.json`:
```json
"asarUnpack": ["node_modules/ffprobe-static/**/*"]
```

Und in `main.js` wird der Pfad zur Laufzeit korrigiert:
```js
const ffprobePath = app.isPackaged
  ? ffprobeRaw.replace('app.asar', 'app.asar.unpacked')
  : ffprobeRaw;
```

→ **Kein Handlungsbedarf**, bereits umgesetzt.

### Antivirenprogramm blockiert den Build

Windows Defender oder andere AV-Software kann `electron-builder` während des Builds unterbrechen.

**Lösung:** Projektordner temporär von der AV-Überwachung ausschließen:
- Windows-Sicherheit → Viren- & Bedrohungsschutz → Ausschlüsse → Ordner hinzufügen

### `node_modules` vom Mac nicht verwenden

Native Module sind plattformspezifisch kompiliert. Ein `node_modules`-Ordner vom Mac funktioniert auf Windows nicht.

**Lösung:** Auf dem Windows-Rechner immer frisch installieren:
```bash
# node_modules löschen falls vorhanden
rmdir /s /q node_modules
npm install
```

### Rechte / UAC beim NSIS-Installer

Der NSIS-Installer in der Standard-Konfiguration installiert pro-User (kein Admin nötig). Falls der Installer einen UAC-Dialog zeigt, liegt das am AV oder an einer eingeschränkten Unternehmensrichtlinie.

### Lange Build-Zeiten

Erster Build kann 3–10 Minuten dauern (Electron-Binary wird heruntergeladen, ~120 MB). Folgebuilds sind deutlich schneller (Cache).

---

## Versionsnummer anpassen

In `package.json`:
```json
{
  "version": "1.0.1"
}
```

Der Installer heißt dann automatisch `Scoreboard Setup 1.0.1.exe`.

---

## Installer-Konfiguration (Referenz)

Aktuelle Konfiguration in `package.json`:

```json
"build": {
  "appId": "com.operun.scoreboard",
  "productName": "Scoreboard",
  "win": {
    "icon": "src/assets/icons/icon.ico",
    "target": "nsis"
  },
  "asarUnpack": ["node_modules/ffprobe-static/**/*"]
}
```

Der NSIS-Installer (`target: "nsis"`) ist der Standard für Windows — erzeugt einen klassischen Setup-Wizard ohne Admin-Rechte (per-user install).

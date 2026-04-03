# Security Audit Report — Scoreboard (TSV 1880 Wasserburg)

**Date:** 2026-04-03  
**Auditor:** Automated Deep Review  
**Scope:** Full codebase (`main`, `HEAD = cedebd3`)  
**Application Type:** Electron Desktop App (offline, single-user/operator)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 0 |
| 🟡 Medium | 2 |
| 🔵 Low | 4 |
| **Total** | **6** |

**Overall Risk Rating: LOW**

This is an offline, single-operator Electron desktop app with no web-facing attack surface, no authentication system, and no user-submitted content from untrusted parties. The operator is the sole user. All previously identified High-severity findings have been resolved.

### Recommended Timeline

| Priority | Items | Effort | Timeline |
|----------|-------|--------|----------|
| P1 (Should-fix) | SEC-04 | ~30min | Within 2 weeks |
| P2 (Nice-to-have) | SEC-05, SEC-07, SEC-08 | ~2h | Within 1 month |
| P3 (Informational) | SEC-02, SEC-09, SEC-10 | ~2h | Backlog |

---

## Findings

### SEC-02 — Chromium Web Security Disabled

| Field | Value |
|---|---|
| **File** | [main.js:884](file:///Users/stefan/Development/scoreboard/main.js#L884), [main.js:921](file:///Users/stefan/Development/scoreboard/main.js#L921) |
| **Type** | CWE-16: Configuration (Electron Security Misconfiguration) |
| **Severity** | 🔵 Low (downgraded from High — mitigated by architecture) |
| **Status** | ⚠️ Accepted Risk |

**Problem:**
```js
webSecurity: false  // both mainWindow and outputWindow
```

This disables the same-origin policy in Chromium, allowing the renderer to fetch any `file://` URL from the entire filesystem.

**Why it exists:** Chromium treats each `file://` path as a separate origin. The app loads from `file:///app/dist/index.html` but needs to display media from `file:///userData/media/...` — without `webSecurity: false` this is blocked by same-origin policy.

**Why acceptable for this app:**

| Risk Factor | Assessment |
|---|---|
| Untrusted content loaded in renderer? | ❌ No — only the app's own React code |
| `eval()`, `innerHTML`, dynamic HTML? | ❌ None |
| nodeIntegration | ❌ Disabled (correct) |
| contextIsolation | ✅ Enabled (correct) |
| Multi-user / internet-facing? | ❌ No — single operator, fully offline |
| Plugin system / external content? | ❌ None |

The exploit precondition — malicious code running in the renderer — is not achievable without first compromising the application binary or its npm dependencies. At that point, `webSecurity` is irrelevant (attacker already has code execution).

**Future fix (optional):** Register a custom `media://` protocol via `protocol.handle()` and serve files only from `userData/media/`. This would allow removing `webSecurity: false` entirely.

---

### SEC-04 — Unvalidated File Paths from Renderer

| Field | Value |
|---|---|
| **File** | [main.js:281-308](file:///Users/stefan/Development/scoreboard/main.js#L281-L308) |
| **Type** | CWE-22: Path Traversal |
| **Severity** | 🟡 Medium — CVSS 5.0 `AV:L/AC:L/PR:L/UI:R/S:U/C:N/I:H/A:N` |
| **Status** | ⚠️ Open |

**Problem:**
`ipcMain.handle('add-media', async (event, filePath) => ...)` accepts a raw file path from the renderer and calls `fs.copyFileSync(filePath, targetPath)`. While the paths come from the OS file dialog (trusted source), there is no validation of file extension or path location.

**Remediation:**
```js
const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.jpg', '.jpeg', '.png'];
const ext = path.extname(filePath).toLowerCase();
if (!allowedExtensions.includes(ext)) {
  return { status: 'error', message: 'Nicht unterstütztes Dateiformat' };
}
```

---

### SEC-05 — Broadcast of IPC Commands to All Windows

| Field | Value |
|---|---|
| **File** | [main.js:559-567](file:///Users/stefan/Development/scoreboard/main.js#L559-L567) |
| **Type** | CWE-284: Improper Access Control |
| **Severity** | 🔵 Low — CVSS 3.5 `AV:L/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` |
| **Status** | ⚠️ Open |

**Problem:**
```js
BrowserWindow.getAllWindows().forEach(win => {
  if (!win.isDestroyed()) {
    win.webContents.send('control-command', { command, payload });
  }
});
```

Game state commands and data-update events (`playlists-updated`, `media-updated`) are broadcast to all windows. This is intentional for data synchronization between Controller and Output windows, but also reaches DevTools if open.

**Remediation:** Target specific windows explicitly for display commands.

---

### SEC-07 — `afterPack.js` Downloads Binary Without Hash Verification

| Field | Value |
|---|---|
| **File** | [afterPack.js:43-82](file:///Users/stefan/Development/scoreboard/afterPack.js#L43-L82) |
| **Type** | CWE-494: Download of Code Without Integrity Check |
| **Severity** | 🟡 Medium — CVSS 4.8 `AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N` |
| **Status** | ⚠️ Open (redirect bug fixed, hash check still missing) |

**Problem:**
The `afterPack` hook downloads the ffmpeg binary from GitHub Releases over HTTPS but does **not verify a SHA256 checksum**. A compromised CDN or MITM on the CI runner could swap the binary.

**Remediation:** Verify the checksum against the official `SHASUMS256.txt` published alongside each Electron release.

---

### SEC-08 — `fluent-ffmpeg` Deprecated & Unsupported

| Field | Value |
|---|---|
| **File** | [package.json](file:///Users/stefan/Development/scoreboard/package.json) |
| **Type** | CWE-1104: Use of Unmaintained Third-Party Components |
| **Severity** | 🔵 Low |
| **Status** | ⚠️ Open |

**Problem:**
`fluent-ffmpeg@2.1.3` is officially deprecated. Used only for ffprobe metadata extraction and video thumbnail generation.

**Remediation:** Replace with `child_process.execFile` calling ffprobe/ffmpeg directly.

---

### SEC-09 — No Content-Security-Policy Headers

| Field | Value |
|---|---|
| **File** | [main.js](file:///Users/stefan/Development/scoreboard/main.js) (absent) |
| **Type** | CWE-1021: Improper Restriction of Rendered UI Layers |
| **Severity** | 🔵 Low |
| **Status** | ⚠️ Open |

**Problem:**
No `Content-Security-Policy` is set on the BrowserWindow. Low risk since the app loads no external content.

**Remediation:** Set a restrictive CSP via `session.defaultSession.webRequest.onHeadersReceived`.

---

### SEC-10 — Dead Code: Unrestricted Menu Item

| Field | Value |
|---|---|
| **File** | [main.js:966-970](file:///Users/stefan/Development/scoreboard/main.js#L966-L970) |
| **Type** | CWE-561: Dead Code |
| **Severity** | 🔵 Low |
| **Status** | ⚠️ Open |

**Problem:**
```js
{ label: 'Neu', click: () => { console.log('Neu gewählt'); } }
```

Dead menu item. Harmless but confusing.

**Remediation:** Remove or implement.

---

## Trust Boundary Analysis

### Third-Party Services

| Service | Protocol | Credential Handling | Risk |
|---|---|---|---|
| **SSH Sync Server** | SSH (Port 22) | Ed25519 key-pair authentication (no passwords) | Low |
| **GitHub Releases** (build time) | HTTPS | No auth needed | Low — integrity not verified (SEC-07) |

### External Network Access

The app makes **no HTTP/HTTPS calls at runtime**. It is fully offline except for the SSH sync feature (user-initiated). The `afterPack.js` script downloads ffmpeg at build time only.

### Local Data Storage

All data is stored as plain JSON files in `userData`:
- `settings.json` — UI preferences, sync host/user config (no credentials)
- `media.json` — media file index
- `playlists.json` — playlist definitions
- `presets.json` — game presets
- `id_ed25519` / `id_ed25519.pub` — SSH key pair for sync authentication

---

## CI/CD Security Checklist

- [ ] **SAST:** Add `github/codeql-action` for JavaScript analysis
- [ ] **Dependency Check:** Add `npm audit --audit-level=high` step
- [ ] **Pin Action Versions:** Pin Actions to SHA hashes
- [ ] **Build Artifact Integrity:** Add checksum generation for the `.exe` installer
- [ ] **Dependabot:** Enable for npm dependency updates

# Security Audit Report — Scoreboard (TSV 1880 Wasserburg)

**Date:** 2026-03-30  
**Auditor:** Automated Deep Review  
**Scope:** Full codebase (`main`, `HEAD = 39252bb`)  
**Application Type:** Electron Desktop App (offline, single-user/operator)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 3 |
| 🟡 Medium | 5 |
| 🔵 Low | 2 |
| **Total** | **10** |

**Overall Risk Rating: MEDIUM**

This is an offline, single-operator Electron desktop app with no web-facing attack surface, no authentication system, and no user-submitted content from untrusted parties. The operator is the sole user. This significantly reduces exploitability for most findings. The highest-severity issues relate to **cryptographic weakness** in local credential storage and **Electron misconfiguration** that unnecessarily broadens the renderer's capability surface.

### Must-Fix Before Production

1. **SEC-01** — Static IV in AES encryption (credential recovery trivial)
2. **SEC-02** — `webSecurity: false` on both BrowserWindows

### Recommended Timeline

| Priority | Items | Effort | Timeline |
|----------|-------|--------|----------|
| P0 (Must-fix) | SEC-01, SEC-02 | ~2h | Before next release |
| P1 (Should-fix) | SEC-03, SEC-04, SEC-06 | ~3h | Within 2 weeks |
| P2 (Nice-to-have) | SEC-05, SEC-07, SEC-08 | ~2h | Within 1 month |
| P3 (Informational) | SEC-09, SEC-10 | ~1h | Backlog |

---

## Findings

### SEC-01 — Static Initialization Vector in AES-256-CBC

| Field | Value |
|---|---|
| **File** | [settingsStore.js:6](file:///Users/stefan/Development/scoreboard/settingsStore.js#L6) |
| **Type** | CWE-329: Generation of Predictable IV with CBC Mode |
| **Severity** | 🟠 High — CVSS 7.1 `AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N` |

**Problem:**
```js
const IV = Buffer.alloc(16, 0); // All-zeros IV — reused for every encryption
```

With a static IV, identical plaintexts always produce identical ciphertexts. An attacker with access to the `settings.json` file can:
- Detect when passwords haven't changed (unchanged ciphertext)
- Mount chosen-plaintext attacks if they can influence the plaintext
- Trivially decrypt credentials if they also obtain the key file (stored adjacent in `userData`)

**PoC:** Read `settings.json` + `encryption-key.bin` from `%APPDATA%\Scoreboard\`. Decrypt with `openssl aes-256-cbc -d -K <hex_key> -iv 00000000000000000000000000000000`.

**Remediation:**
```js
function encrypt(data) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16); // Random IV per encryption
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted; // Prepend IV
}
```

---

### SEC-02 — Chromium Web Security Disabled

| Field | Value |
|---|---|
| **File** | [main.js:729](file:///Users/stefan/Development/scoreboard/main.js#L729), [main.js:766](file:///Users/stefan/Development/scoreboard/main.js#L766) |
| **Type** | CWE-16: Configuration (Electron Security Misconfiguration) |
| **Severity** | 🟠 High — CVSS 6.5 `AV:L/AC:L/PR:N/UI:R/S:C/C:H/I:N/A:N` |

**Problem:**
```js
webSecurity: false  // both mainWindow and outputWindow
```

This disables the same-origin policy in Chromium, allowing the renderer to:
- Fetch any `file://` URL from the entire filesystem
- Bypass CORS restrictions entirely
- If combined with any future code that loads external content or user-supplied HTML, this becomes an arbitrary file read primitive

**Why it exists:** The app uses `file://` protocol to load local media. Disabling web security was a shortcut.

**Remediation:** Register a custom protocol handler via `protocol.handle()` and remove `webSecurity: false`:

```js
const { protocol } = require('electron');

app.whenReady().then(() => {
  protocol.handle('media', (request) => {
    const filePath = request.url.replace('media://', '');
    // Validate filePath is within userData/media
    return net.fetch('file://' + filePath);
  });
});
```

Then reference media as `media://path/to/file.mp4` in the renderer.

---

### SEC-03 — SSH Credentials in Encrypted JSON File

| Field | Value |
|---|---|
| **File** | [settingsStore.js](file:///Users/stefan/Development/scoreboard/settingsStore.js), [main.js:115](file:///Users/stefan/Development/scoreboard/main.js#L115) |
| **Type** | CWE-522: Insufficiently Protected Credentials |
| **Severity** | 🟠 High — CVSS 6.1 `AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N` |

**Problem:**  
SSH password is stored in an encrypted JSON file alongside its encryption key (`encryption-key.bin`). Both reside in `%APPDATA%\Scoreboard\`. Any local process or user with file access can recover the SSH password.

**Impact:** Compromise of the remote sync server credentials. Given the Electron app runs on a shared venue PC (Windows 11), other users or malware on that PC could extract the credentials.

**Remediation:**  
Use the OS credential store via [keytar](https://github.com/nicosb/keytar) or [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage):

```js
const { safeStorage } = require('electron');

// Encrypt with OS-level DPAPI (Windows) / Keychain (macOS)
const encrypted = safeStorage.encryptString(password);
// Store as Buffer, not alongside a plaintext key file
```

> [!NOTE]
> `safeStorage` is the Electron-native solution (uses DPAPI on Windows, Keychain on macOS). No additional dependency needed.

---

### SEC-04 — Unvalidated File Paths from Renderer

| Field | Value |
|---|---|
| **File** | [main.js:174-201](file:///Users/stefan/Development/scoreboard/main.js#L174-L201) |
| **Type** | CWE-22: Path Traversal |
| **Severity** | 🟡 Medium — CVSS 5.0 `AV:L/AC:L/PR:L/UI:R/S:U/C:N/I:H/A:N` |

**Problem:**  
`ipcMain.handle('add-media', async (event, filePath) => ...)` accepts a raw file path from the renderer and calls `fs.copyFileSync(filePath, targetPath)`. While the renderer itself supplies this via a dialog or drag-and-drop (trusted source), there is no validation that the path:
- Is within expected locations
- Is not a system file (e.g. `/etc/shadow`, `C:\Windows\System32\config\SAM`)
- Is not a symlink to a sensitive location

**Exploit sketch:** In current usage, paths come from the OS file dialog (safe). But if the IPC API is ever exposed to untrusted content (e.g. a plugin system), arbitrary files could be copied into the media store and then served via `file://`.

**Remediation:**
```js
// Validate file extension
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
| **File** | [main.js:449-457](file:///Users/stefan/Development/scoreboard/main.js#L449-L457) |
| **Type** | CWE-284: Improper Access Control |
| **Severity** | 🟡 Medium — CVSS 3.5 `AV:L/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` |

**Problem:**
```js
BrowserWindow.getAllWindows().forEach(win => {
  if (!win.isDestroyed()) {
    win.webContents.send('control-command', { command, payload });
  }
});
```

Commands including game state and potentially sensitive settings are broadcast to **all** windows (including DevTools if open). The sender window also receives its own commands, which currently has no ill effect but could cause recursive loops with future changes.

**Remediation:** Target only the output window explicitly:
```js
if (outputWindow && !outputWindow.isDestroyed()) {
  outputWindow.webContents.send('control-command', { command, payload });
}
```

---

### SEC-06 — Dependency Vulnerabilities (npm audit)

| Field | Value |
|---|---|
| **File** | [package-lock.json](file:///Users/stefan/Development/scoreboard/package-lock.json) |
| **Type** | CWE-1395: Dependency on Vulnerable Third-Party Component |
| **Severity** | 🟡 Medium — Varies by CVE |

**`npm audit` results:** 7 known vulnerabilities (5 high, 2 moderate)

| Package | Severity | Issue | Fix Available |
|---|---|---|---|
| `immutable` | 🟠 High | Prototype Pollution (CWE-1321) | ✅ |
| `minimatch` | 🟠 High | ReDoS (CWE-1333) | ✅ |
| `picomatch` | 🟠 High | ReDoS | ✅ |
| `rollup` | 🟠 High | (transitive via vite) | ✅ |
| `tar` | 🟠 High | (transitive) | ✅ |
| `ajv` | 🟡 Moderate | ReDoS (CWE-1333) | ✅ |
| `brace-expansion` | 🟡 Moderate | DoS (CWE-400) | ✅ |

**Impact:** All vulnerable packages are indirect dependencies used at build-time or in the Electron main process. The ReDoS vulnerabilities are low-risk in a single-user desktop context (no untrusted input to glob/match patterns). The prototype pollution in `immutable` is more concerning (used by `sass`).

**Remediation:** `npm audit fix` resolves all issues. For transitive dependencies: `npm update` or override in `package.json`.

---

### SEC-07 — `afterPack.js` Downloads Binary Over HTTPS Without Hash Verification

| Field | Value |
|---|---|
| **File** | [afterPack.js:43-69](file:///Users/stefan/Development/scoreboard/afterPack.js#L43-L69) |
| **Type** | CWE-494: Download of Code Without Integrity Check |
| **Severity** | 🟡 Medium — CVSS 4.8 `AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N` |

**Problem:**  
The `afterPack` hook downloads the ffmpeg binary from GitHub Releases and replaces the bundled one. The download uses HTTPS (good) but does **not verify a SHA256 checksum** of the downloaded zip.

**Exploit sketch:** A compromised DNS/CDN or MITM on the CI runner could swap the ffmpeg binary with a malicious one that would be included in all distributed builds.

**Remediation:** Verify the checksum against the official `SHASUMS256.txt` published alongside each Electron release.

---

### SEC-08 — `fluent-ffmpeg` Deprecated & Unsupported

| Field | Value |
|---|---|
| **File** | [package.json:33](file:///Users/stefan/Development/scoreboard/package.json#L33) |
| **Type** | CWE-1104: Use of Unmaintained Third-Party Components |
| **Severity** | 🟡 Medium — CVSS 3.7 `AV:L/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:L` |

**Problem:**  
`fluent-ffmpeg@2.1.3` is officially deprecated ("Package no longer supported"). It spawns child processes with shell options, which triggers Node.js deprecation `DEP0190` (visible in the CI log). The npm install warns explicitly.

**Remediation:** Evaluate alternatives (`ffmpeg-static` + direct `child_process.execFile`) or fork the library. The current usage is minimal (ffprobe metadata extraction only).

---

### SEC-09 — No Content-Security-Policy Headers

| Field | Value |
|---|---|
| **File** | [main.js](file:///Users/stefan/Development/scoreboard/main.js) (absent) |
| **Type** | CWE-1021: Improper Restriction of Rendered UI Layers |
| **Severity** | 🔵 Low — CVSS 2.0 `AV:L/AC:H/PR:L/UI:R/S:U/C:L/I:N/A:N` |

**Problem:**  
No `Content-Security-Policy` is set on the BrowserWindow. The app could theoretically load external scripts if a future code change introduces dynamic content.

**Remediation:** Set a restrictive CSP via `session.defaultSession.webRequest`:
```js
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' file: media:; media-src 'self' file: media:"]
    }
  });
});
```

---

### SEC-10 — Dead Code: Unrestricted Menu Item

| Field | Value |
|---|---|
| **File** | [main.js:812-815](file:///Users/stefan/Development/scoreboard/main.js#L812-L815) |
| **Type** | CWE-561: Dead Code |
| **Severity** | 🔵 Low — CVSS 0.0 |

**Problem:**
```js
{ label: 'Neu', click: () => { console.log('Neu gewählt'); } }
```

Dead menu item that does nothing. Harmless, but confusing to users and should be removed or implemented.

**Remediation:** Remove or implement the "Datei → Neu" menu entry.

---

## Trust Boundary Analysis

### Third-Party Services

| Service | Protocol | Credential Handling | Risk |
|---|---|---|---|
| **SSH/SFTP Sync Server** | SSH (Port 22) | Password stored in encrypted JSON (see SEC-01, SEC-03) | Medium — credential theft enables server access |
| **GitHub Releases** (build time) | HTTPS | No auth needed (public download) | Low — integrity not verified (SEC-07) |

### External Network Access

The app makes **no HTTP/HTTPS calls at runtime** — it is fully offline except for the SSH sync feature (user-initiated). The `afterPack.js` script downloads ffmpeg at build time only.

---

## CI/CD Security Checklist

### Recommended for GitHub Actions Pipeline

- [ ] **SAST:** Add `github/codeql-action` for JavaScript analysis
- [ ] **Dependency Check:** Add `npm audit --audit-level=high` step that fails the build on high-severity CVEs
- [ ] **Secret Scanning:** Ensure GitHub Advanced Security secret scanning is enabled on the repo
- [ ] **Pin Action Versions:** Pin all Actions to SHA hashes instead of tags (`actions/checkout@<sha>`)
- [ ] **Least Privilege:** Current `permissions: contents: write` is correct; do not add more
- [ ] **Build Artifact Integrity:** Add checksum generation step for the `.exe` installer
- [ ] **Dependabot:** Enable Dependabot for npm dependency updates

### Workflow Snippet for Dependency Check

```yaml
      - name: Security audit
        run: npm audit --audit-level=high
        continue-on-error: true  # Set to false once all high-severity issues are fixed
```

### Recommended `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

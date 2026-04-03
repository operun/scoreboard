# Security Audit Report — Scoreboard (TSV 1880 Wasserburg)

**Date:** 2026-04-03 (Updated)  
**Previous Audit:** 2026-03-30  
**Auditor:** Automated Deep Review  
**Scope:** Full codebase (`main`, `HEAD = 6181ba5`)  
**Application Type:** Electron Desktop App (offline, single-user/operator)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 2 |
| 🟡 Medium | 3 |
| 🔵 Low | 3 |
| **Total** | **8** | |

**Overall Risk Rating: MEDIUM** (unchanged)

This is an offline, single-operator Electron desktop app with no web-facing attack surface, no authentication system, and no user-submitted content from untrusted parties. The operator is the sole user.



### Must-Fix Before Production

1. **SEC-01** — Static IV in AES encryption (credential recovery trivial)
2. **SEC-02** — `webSecurity: false` on both BrowserWindows

### Recommended Timeline

| Priority | Items | Effort | Timeline |
|----------|-------|--------|----------|
| P0 (Must-fix) | SEC-01, SEC-02 | ~2h | Before next release |
| P1 (Should-fix) | SEC-04, SEC-11 | ~2h | Within 2 weeks |
| P2 (Nice-to-have) | SEC-05, SEC-07, SEC-08 | ~2h | Within 1 month |
| P3 (Informational) | SEC-09, SEC-10 | ~1h | Backlog |

---

## Active Findings

### SEC-01 — Static Initialization Vector in AES-256-CBC

| Field | Value |
|---|---|
| **File** | [settingsStore.js:6](file:///Users/stefan/Development/scoreboard/settingsStore.js#L6) |
| **Type** | CWE-329: Generation of Predictable IV with CBC Mode |
| **Severity** | 🟠 High — CVSS 7.1 `AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N` |
| **Status** | ✅ Resolved (2026-04-03) |

**Resolution:** Encryption completely removed. `settingsStore.js` now uses plain `JSON.parse`/`JSON.stringify`. Since SSH passwords were already migrated to key-pair authentication, `settings.json` no longer contains any sensitive credentials — only sync host/user config and UI preferences. The `encryption-key.bin` is no longer created or used.

**Problem:**
```js
const IV = Buffer.alloc(16, 0); // All-zeros IV — reused for every encryption
```

With a static IV, identical plaintexts always produce identical ciphertexts. An attacker with access to the `settings.json` file can:
- Detect when settings haven't changed (unchanged ciphertext)
- Mount chosen-plaintext attacks if they can influence the plaintext
- Trivially decrypt settings if they also obtain the key file (stored adjacent in `userData`)

**PoC:** Read `settings.json` + `encryption-key.bin` from `%APPDATA%\Scoreboard\`. Decrypt with `openssl aes-256-cbc -d -K <hex_key> -iv 00000000000000000000000000000000`.

**Note:** Since SSH password authentication has been replaced with key-pair auth (see SEC-03 Resolved), the encrypted settings no longer contain passwords. The remaining encrypted data includes sync host/user configuration and UI preferences. The impact is reduced but the cryptographic weakness remains.

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
| **File** | [main.js:883](file:///Users/stefan/Development/scoreboard/main.js#L883), [main.js:920](file:///Users/stefan/Development/scoreboard/main.js#L920) |
| **Type** | CWE-16: Configuration (Electron Security Misconfiguration) |
| **Severity** | 🟠 High — CVSS 6.5 `AV:L/AC:L/PR:N/UI:R/S:C/C:H/I:N/A:N` |
| **Status** | ⚠️ Open (unchanged since last audit) |

**Problem:**
```js
webSecurity: false  // both mainWindow (line 920) and outputWindow (line 883)
```

This disables the same-origin policy in Chromium, allowing the renderer to:
- Fetch any `file://` URL from the entire filesystem
- Bypass CORS restrictions entirely
- If combined with any future code that loads external content or user-supplied HTML, this becomes an arbitrary file read primitive

**Why it exists:** The app uses `file://` protocol to load local media. Disabling web security was a shortcut. The recent migration to `pathToFileURL()` in `load-media` (returning proper `file:///` URLs) was a step in the right direction but does not eliminate the need for `webSecurity: false`.

**Remediation:** Register a custom protocol handler via `protocol.handle()` and remove `webSecurity: false`:

```js
const { protocol, net } = require('electron');

app.whenReady().then(() => {
  protocol.handle('media', (request) => {
    const filePath = decodeURIComponent(request.url.replace('media://', ''));
    const userData = app.getPath('userData');
    // Validate filePath is within userData/media
    if (!filePath.startsWith(path.join(userData, 'media'))) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch('file://' + filePath);
  });
});
```

Then reference media as `media://path/to/file.mp4` in the renderer.

---

### SEC-04 — Unvalidated File Paths from Renderer

| Field | Value |
|---|---|
| **File** | [main.js:281-308](file:///Users/stefan/Development/scoreboard/main.js#L281-L308) |
| **Type** | CWE-22: Path Traversal |
| **Severity** | 🟡 Medium — CVSS 5.0 `AV:L/AC:L/PR:L/UI:R/S:U/C:N/I:H/A:N` |
| **Status** | ⚠️ Open (unchanged since last audit) |

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
| **File** | [main.js:559-567](file:///Users/stefan/Development/scoreboard/main.js#L559-L567) |
| **Type** | CWE-284: Improper Access Control |
| **Severity** | 🟡 Medium — CVSS 3.5 `AV:L/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` |
| **Status** | ⚠️ Open (unchanged since last audit) |

**Problem:**
```js
BrowserWindow.getAllWindows().forEach(win => {
  if (!win.isDestroyed()) {
    win.webContents.send('control-command', { command, payload });
  }
});
```

Commands including game state are broadcast to **all** windows (including DevTools if open). The sender window also receives its own commands. Additionally, the new `playlists-updated` and `media-updated` broadcasts (added in this session) follow the same pattern — this is intentional for data synchronization but amplifies the surface.

**Remediation:** Target only the output window explicitly for display commands:
```js
if (outputWindow && !outputWindow.isDestroyed()) {
  outputWindow.webContents.send('control-command', { command, payload });
}
```

---

### SEC-07 — `afterPack.js` Downloads Binary Over HTTPS Without Hash Verification

| Field | Value |
|---|---|
| **File** | [afterPack.js:43-82](file:///Users/stefan/Development/scoreboard/afterPack.js#L43-L82) |
| **Type** | CWE-494: Download of Code Without Integrity Check |
| **Severity** | 🟡 Medium — CVSS 4.8 `AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N` |
| **Status** | ⬇️ Improved (redirect bug fixed, hash check still missing) |

**Problem:**
The `afterPack` hook downloads the ffmpeg binary from GitHub Releases and replaces the bundled one. The download uses HTTPS (good) and properly handles HTTP redirects now (previously crashed on 302 → "write after end" error), but does **not verify a SHA256 checksum** of the downloaded zip.

**What was fixed (2026-04-03):**
- `downloadFile()` no longer creates a `WriteStream` before redirects are resolved (previously caused `ERR_STREAM_WRITE_AFTER_END` crash on Windows CI)
- 60s timeout added to prevent indefinite hangs
- Max 5 redirects enforced
- Redirect response bodies are properly drained via `res.resume()`

**Remaining risk:** A compromised DNS/CDN or MITM on the CI runner could swap the ffmpeg binary.

**Remediation:** Verify the checksum against the official `SHASUMS256.txt` published alongside each Electron release.

---

### SEC-08 — `fluent-ffmpeg` Deprecated & Unsupported

| Field | Value |
|---|---|
| **File** | [package.json:33](file:///Users/stefan/Development/scoreboard/package.json#L33) |
| **Type** | CWE-1104: Use of Unmaintained Third-Party Components |
| **Severity** | 🔵 Low (downgraded from Medium — single-user app, limited usage) |
| **Status** | ⚠️ Open |

**Problem:**
`fluent-ffmpeg@2.1.3` is officially deprecated ("Package no longer supported"). It spawns child processes with shell options, which triggers Node.js deprecation `DEP0190`. The npm install warns explicitly.

**Current usage:** ffprobe metadata extraction (duration) and video thumbnail generation only.

**Remediation:** Evaluate alternatives (`ffmpeg-static` + direct `child_process.execFile`) or fork the library.

---

### SEC-09 — No Content-Security-Policy Headers

| Field | Value |
|---|---|
| **File** | [main.js](file:///Users/stefan/Development/scoreboard/main.js) (absent) |
| **Type** | CWE-1021: Improper Restriction of Rendered UI Layers |
| **Severity** | 🔵 Low — CVSS 2.0 `AV:L/AC:H/PR:L/UI:R/S:U/C:L/I:N/A:N` |
| **Status** | ⚠️ Open (unchanged since last audit) |

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
| **File** | [main.js:966-970](file:///Users/stefan/Development/scoreboard/main.js#L966-L970) |
| **Type** | CWE-561: Dead Code |
| **Severity** | 🔵 Low — CVSS 0.0 |
| **Status** | ⚠️ Open (unchanged since last audit) |

**Problem:**
```js
{ label: 'Neu', click: () => { console.log('Neu gewählt'); } }
```

Dead menu item that does nothing. Harmless, but confusing to users and should be removed or implemented.

**Remediation:** Remove or implement the "Datei → Neu" menu entry.

---

### SEC-11 — Command Injection in ssh-keygen Call 🆕

| Field | Value |
|---|---|
| **File** | [main.js:88-93](file:///Users/stefan/Development/scoreboard/main.js#L88-L93) |
| **Type** | CWE-78: OS Command Injection |
| **Severity** | 🔵 Low — CVSS 2.0 `AV:L/AC:H/PR:L/UI:R/S:U/C:N/I:L/A:N` |
| **Status** | ✅ Resolved (2026-04-03) |

**Resolution:** Replaced `execSync` with `execFileSync` and passes arguments as an array instead of interpolated strings. This prevents shell injection via username or hostname values.

```js
execFileSync('ssh-keygen', ['-t', 'ed25519', '-C', comment, '-f', SSH_KEY_PATH, '-N', '']);
```

**Problem:**
```js
const comment = `${getSyncConfig().user}@${hostname}`;
execSync(`ssh-keygen -t ed25519 -C "${comment}" -f "${SSH_KEY_PATH}" -N ""`);
```

The `comment` value includes `getSyncConfig().user` which is read from the user-editable settings, and `os.hostname()`. These are interpolated directly into a shell command. A user who sets their sync username to `"; rm -rf / #` could achieve command injection.

**Mitigating factors:**
- Settings are encrypted (SEC-01 makes this weak)
- Only the app operator can change settings
- This is a self-attacking scenario (operator injecting commands on their own machine)

**Remediation:** Use `execFileSync` instead of `execSync` to avoid shell interpolation:
```js
const { execFileSync } = require('child_process');
execFileSync('ssh-keygen', ['-t', 'ed25519', '-C', comment, '-f', SSH_KEY_PATH, '-N', '']);
```

---


## Trust Boundary Analysis

### Third-Party Services

| Service | Protocol | Credential Handling | Risk |
|---|---|---|---|
| **SSH Sync Server** | SSH (Port 22) | Ed25519 key-pair authentication (no passwords) | Low — key file on disk, but no credential theft enables server access without the file |
| **GitHub Releases** (build time) | HTTPS | No auth needed (public download) | Low — integrity not verified (SEC-07) |

### External Network Access

The app makes **no HTTP/HTTPS calls at runtime** — it is fully offline except for the SSH sync feature (user-initiated). The `afterPack.js` script downloads ffmpeg at build time only.

### Local File Access

Since 2026-04-03, media file paths are converted to proper `file:///` URLs using Node.js `pathToFileURL()` in the main process. This ensures cross-platform correctness (especially on Windows where backslash paths were previously broken), but does not restrict which files can be accessed — `webSecurity: false` (SEC-02) still allows unrestricted `file://` access.

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

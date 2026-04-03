import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { BsClipboard, BsXCircle } from 'react-icons/bs';

const API_KEY = 'cfeb5dfb523416720d55c9b967d5d56e';

function SettingsView() {
  const [sshKeyInfo, setSshKeyInfo] = useState({ exists: false, publicKey: null, fingerprint: null });
  const [sendingKey, setSendingKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncHost, setSyncHost] = useState('sync.operun.de');
  const [syncUser, setSyncUser] = useState('scoreboard');
  const [outputWidth, setOutputWidth] = useState(1280);
  const [outputHeight, setOutputHeight] = useState(720);
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [customTestImageName, setCustomTestImageName] = useState(null);
  const [themeMode, setThemeMode] = useState('system');
  const [scoreboardBgId, setScoreboardBgId] = useState(null);
  const [scoreboardBgName, setScoreboardBgName] = useState(null);
  const [scoreboardSponsorId, setScoreboardSponsorId] = useState(null);
  const [scoreboardSponsorName, setScoreboardSponsorName] = useState(null);
  const [mediaImages, setMediaImages] = useState([]); // for picker dropdowns
  const [controllerVisibility, setControllerVisibility] = useState({
    warmup: true, lineup: true, halftime: true, end: true,
    goalHome: true, goalGuest: true, sub: true, yellow: true, red: true, var: true, special: true, corner: true, overtime: true, announcement: true
  });

  const [activeTab, setActiveTab] = useState('output');
  const [versions, setVersions] = useState(null);
  const settingsRef = useState({})[0];

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await window.electronAPI.loadSettings();
      if (settings) {
        Object.assign(settingsRef, settings);
        if (settings.outputWidth) setOutputWidth(settings.outputWidth);
        if (settings.outputHeight) setOutputHeight(settings.outputHeight);
        setShowCropMarks(settings.showCropMarks !== false);
        if (settings.customTestImageName) setCustomTestImageName(settings.customTestImageName);
        if (settings.themeMode) setThemeMode(settings.themeMode);
        if (settings.controllerVisibility) setControllerVisibility(prev => ({ ...prev, ...settings.controllerVisibility }));
        if (settings.scoreboardBgId) setScoreboardBgId(settings.scoreboardBgId);
        if (settings.scoreboardBgName) setScoreboardBgName(settings.scoreboardBgName);
        if (settings.scoreboardSponsorId) setScoreboardSponsorId(settings.scoreboardSponsorId);
        if (settings.scoreboardSponsorName) setScoreboardSponsorName(settings.scoreboardSponsorName);
        if (settings.syncHost) setSyncHost(settings.syncHost);
        if (settings.syncUser) setSyncUser(settings.syncUser);
      }
      // Load image list for pickers
      const allMedia = await window.electronAPI.loadMedia();
      setMediaImages(allMedia.filter(m => m.type === 'image'));
    };
    loadSettings();

    // Load version info
    window.electronAPI.getVersions().then(setVersions);

    // Load SSH key info
    window.electronAPI.getSSHKeyInfo().then(setSshKeyInfo);
  }, []);

  // Helper to save current state
  const saveAllSettings = (overrides = {}) => {
    const newSettings = {
      outputWidth,
      outputHeight,
      showCropMarks,
      themeMode,
      controllerVisibility,
      scoreboardBgId,
      scoreboardBgName,
      scoreboardSponsorId,
      scoreboardSponsorName,
      syncHost,
      syncUser,
      ...overrides
    };
    Object.assign(settingsRef, newSettings);
    window.electronAPI.saveSettings(newSettings);
  };

  const handleOutputChange = (changes) => {
    // Update state and save
    if ('width' in changes) setOutputWidth(changes.width);
    if ('height' in changes) setOutputHeight(changes.height);
    if ('crop' in changes) setShowCropMarks(changes.crop);

    // Prepare save object
    const saveObj = {};
    if ('width' in changes) saveObj.outputWidth = changes.width;
    if ('height' in changes) saveObj.outputHeight = changes.height;
    if ('crop' in changes) saveObj.showCropMarks = changes.crop;

    saveAllSettings(saveObj);
  };

  const handleVisibilityChange = (key, value) => {
    const newVisibility = { ...controllerVisibility, [key]: value };
    setControllerVisibility(newVisibility);
    saveAllSettings({ controllerVisibility: newVisibility });
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await window.electronAPI.testConnection();
      if (result.status === 'ok') {
        toast.success(result.message, { autoClose: 5000 });
      } else {
        toast.error(result.message, { autoClose: 8000 });
      }
    } catch (e) {
      toast.error('Unbekannter Fehler: ' + e.message, { autoClose: 8000 });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="container">

      <div className="d-flex align-items-center mb-4">

        <div className="me-5">
          <h1>Einstellungen</h1>
        </div>

        <ul className="nav nav-underline">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveTab('output')}
            >
              Ausgabe
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'connection' ? 'active' : ''}`}
              onClick={() => setActiveTab('connection')}
            >
              Verbindung
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              Aussehen
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'reset' ? 'active' : ''}`}
              onClick={() => setActiveTab('reset')}
            >
              Reset
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              Über
            </button>
          </li>
        </ul>

      </div >


      <div className="row">
        <div className="col-md-8 col-lg-6">

          {activeTab === 'output' && (
            <>
              <div className="row mb-4">
                <div className="col-6">
                  <div>
                    <label className="form-label">Breite (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={outputWidth}
                      onChange={(e) => handleOutputChange({ width: parseInt(e.target.value) || 1280 })}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <div>
                    <label className="form-label">Höhe (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={outputHeight}
                      onChange={(e) => handleOutputChange({ height: parseInt(e.target.value) || 720 })}
                    />
                  </div>
                </div>
              </div>
              <div className="mb-4 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="cropMarksCheck"
                  checked={showCropMarks}
                  onChange={(e) => handleOutputChange({ crop: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="cropMarksCheck">Markierungen anzeigen</label>
              </div>

              <div className="mb-4">
                <label className="form-label">Testbild</label>
                {customTestImageName ? (
                  <div className="d-flex align-items-center">
                    <span className="text-success fw-bold">{customTestImageName}</span>
                    <button className="btn btn-link text-danger" onClick={async () => {
                      await window.electronAPI.deleteTestImage();
                      setCustomTestImageName(null);
                      toast.info("Testbild zurückgesetzt");
                    }}>
                      <BsXCircle />
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={async () => {
                    const result = await window.electronAPI.selectTestImage();
                    if (result && result.name) {
                      setCustomTestImageName(result.name);
                      toast.success("Testbild aktualisiert");
                    }
                  }}>
                    Testbild hochladen
                  </button>
                )}
              </div>

              {/* Scoreboard Background */}
              <div className="mb-4">
                <label className="form-label">Hintergrund (Spielstand)</label>
                {scoreboardBgId ? (
                  <div className="d-flex align-items-center gap-3">
                    <span className="text-success fw-bold">{scoreboardBgName || scoreboardBgId}</span>
                    <button className="btn btn-link text-danger p-0" onClick={() => {
                      setScoreboardBgId(null);
                      setScoreboardBgName(null);
                      saveAllSettings({ scoreboardBgId: null, scoreboardBgName: null });
                      toast.info("Hintergrund entfernt");
                    }}><BsXCircle /></button>
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value=""
                    onChange={(e) => {
                      const img = mediaImages.find(m => m.id === e.target.value);
                      if (!img) return;
                      setScoreboardBgId(img.id);
                      setScoreboardBgName(img.fileName);
                      saveAllSettings({ scoreboardBgId: img.id, scoreboardBgName: img.fileName });
                      toast.success('Hintergrund gespeichert');
                    }}
                  >
                    <option value="">-- Bild auswählen --</option>
                    {mediaImages.map(m => <option key={m.id} value={m.id}>{m.fileName}</option>)}
                  </select>
                )}
              </div>

              {/* Sponsor */}
              <div className="mb-4">
                <label className="form-label">Hauptsponsor</label>
                {scoreboardSponsorId ? (
                  <div className="d-flex align-items-center gap-3">
                    <span className="text-success fw-bold">{scoreboardSponsorName || scoreboardSponsorId}</span>
                    <button className="btn btn-link text-danger p-0" onClick={() => {
                      setScoreboardSponsorId(null);
                      setScoreboardSponsorName(null);
                      saveAllSettings({ scoreboardSponsorId: null, scoreboardSponsorName: null });
                      toast.info("Sponsor entfernt");
                    }}><BsXCircle /></button>
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value=""
                    onChange={(e) => {
                      const img = mediaImages.find(m => m.id === e.target.value);
                      if (!img) return;
                      setScoreboardSponsorId(img.id);
                      setScoreboardSponsorName(img.fileName);
                      saveAllSettings({ scoreboardSponsorId: img.id, scoreboardSponsorName: img.fileName });
                      toast.success('Sponsor gespeichert');
                    }}
                  >
                    <option value="">-- Bild auswählen --</option>
                    {mediaImages.map(m => <option key={m.id} value={m.id}>{m.fileName}</option>)}
                  </select>
                )}
              </div>
            </>
          )}

          {activeTab === 'connection' && (
            <>
              <div className="mb-3">
                <label className="form-label">Server</label>
                <input
                  type="text"
                  className="form-control"
                  value={syncHost}
                  onChange={(e) => setSyncHost(e.target.value)}
                  onBlur={() => saveAllSettings({ syncHost })}
                  placeholder="sync.operun.de"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Benutzer</label>
                <input
                  type="text"
                  className="form-control"
                  value={syncUser}
                  onChange={(e) => setSyncUser(e.target.value)}
                  onBlur={() => saveAllSettings({ syncUser })}
                  placeholder="scoreboard"
                />
              </div>
              <div className="mb-4">
                <label className="form-label">SSH-Schlüssel (öffentlich)</label>
                {sshKeyInfo.exists ? (
                  <>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        className="form-control font-monospace"
                        style={{ fontSize: '0.75rem', resize: 'none', paddingRight: '2.5rem' }}
                        rows={3}
                        readOnly
                        disabled
                        value={sshKeyInfo.publicKey || ''}
                      />
                      <button
                        className="btn btn-sm"
                        title="Schlüssel kopieren"
                        style={{ position: 'absolute', top: '0.35rem', right: '0.35rem', opacity: 0.6, lineHeight: 1 }}
                        onClick={() => {
                          navigator.clipboard.writeText(sshKeyInfo.publicKey);
                          toast.success('Schlüssel kopiert');
                        }}
                      >
                        <BsClipboard />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <input type="text" className="form-control" disabled placeholder="Kein Schlüssel vorhanden" />
                    <div className="form-text">Bitte zuerst einen Schlüssel generieren.</div>
                  </>
                )}
              </div>
              <div className="d-flex gap-2 mb-4">
                {!sshKeyInfo.exists && (
                  <button className="btn btn-primary" onClick={async () => {
                    const result = await window.electronAPI.generateSSHKey();
                    if (result.status === 'ok') {
                      setSshKeyInfo({ exists: true, publicKey: result.publicKey, fingerprint: result.fingerprint });
                      toast.success('SSH-Schlüssel erzeugt');
                    } else {
                      toast.error(result.message);
                    }
                  }}>
                    Schlüssel generieren
                  </button>
                )}
                {sshKeyInfo.exists && (
                  <button
                    className="btn btn-outline-primary"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? 'Verbinde...' : 'Verbindung testen'}
                  </button>
                )}
                {sshKeyInfo.exists && (
                  <button
                    className="btn btn-outline-danger"
                    onClick={async () => {
                      if (!confirm('Neuen SSH-Schlüssel erstellen? Der bisherige verliert den Zugang zum Server.')) return;
                      const result = await window.electronAPI.regenerateSSHKey();
                      if (result.status === 'ok') {
                        setSshKeyInfo({ exists: true, publicKey: result.publicKey, fingerprint: result.fingerprint });
                        toast.success('Neuer SSH-Schlüssel erstellt');
                      } else {
                        toast.error(result.message);
                      }
                    }}
                  >
                    Schlüssel erneuern
                  </button>
                )}
              </div>
              {sshKeyInfo.exists && (
                <p className="text-muted small">
                  Bitte senden Sie den Schlüssel an Ihren Administrator, um die Synchronisation zu aktivieren.{' '}
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (sendingKey) return;
                      setSendingKey(true);
                      try {
                        const body = new URLSearchParams();
                        body.append('subject', 'Scoreboard: SSH-Schlüssel Registrierung');
                        body.append('message',
                          `SSH Public Key:\n\n${sshKeyInfo.publicKey}\n\nFingerprint: ${sshKeyInfo.fingerprint}`);
                        body.append('redirect', 'https://www.operun.de');
                        const res = await fetch(`https://api.operun.de/mail/v1/send?key=${API_KEY}`, {
                          method: 'POST',
                          body,
                          redirect: 'manual',
                        });
                        // 302 → opaqueredirect (status 0) = success
                        if (res.type === 'opaqueredirect' || res.ok) {
                          toast.success('Schlüssel gesendet');
                        } else {
                          toast.error(`Senden fehlgeschlagen (${res.status})`);
                        }
                      } catch {
                        toast.error('Senden fehlgeschlagen');
                      } finally {
                        setSendingKey(false);
                      }
                    }}
                  >
                    Klicken Sie hier
                  </a>{' '}
                  um den Key automatisch zu senden.
                </p>
              )}
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <div className="mb-4">
                <label className="form-label">Modus</label>
                <select
                  className="form-select"
                  value={themeMode}
                  onChange={(e) => {
                    const newMode = e.target.value;
                    setThemeMode(newMode);
                    saveAllSettings({ themeMode: newMode });
                    // Toast logic is handled via settings update, or kept explicitly here?
                    // Previous logic:
                    setTimeout(() => {
                      toast.success('Design-Modus gespeichert');
                    }, 50);
                  }}
                >
                  <option value="system">System (Auto)</option>
                  <option value="light">Hell</option>
                  <option value="dark">Dunkel</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label">Szenen</label>
                <div className="d-flex flex-column gap-1">
                  {[
                    { key: 'warmup', label: 'Warmup' },
                    { key: 'lineup', label: 'Aufstellung' },
                    { key: 'halftime', label: 'Halbzeit' },
                    { key: 'end', label: 'Abpfiff' },
                    { key: 'goalHome', label: 'Tor Heim' },
                    { key: 'goalGuest', label: 'Tor Gast' },
                    { key: 'sub', label: 'Wechsel' },
                    { key: 'yellow', label: 'Gelbe Karte' },
                    { key: 'red', label: 'Rote Karte' },
                    { key: 'var', label: 'VAR Check' },
                    { key: 'special', label: 'Special' },
                    { key: 'corner', label: 'Eckstoß' },
                    { key: 'overtime', label: 'Nachspielzeit' },
                    { key: 'announcement', label: 'Durchsage' },
                  ].map(({ key, label }) => (
                    <div className="form-check" key={key}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`vis-${key}`}
                        checked={controllerVisibility[key]}
                        onChange={(e) => handleVisibilityChange(key, e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor={`vis-${key}`}>
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'about' && (
            <>
              <p className="lead mb-4">Die Scoreboard App wurde für den TSV 1880 Wasserburg entwickelt und wird bereitgestellt von <a href="https://www.operun.de">operun Digital Solutions</a>.</p>
              <div className="mb-4">
                <label className="form-label">Versionshinweise</label>
                <table className="table table-sm" style={{ fontSize: '0.88rem' }}>
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: 160 }}>Version</td>
                      <td className="font-monospace">{versions?.app ?? '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Electron</td>
                      <td className="font-monospace">{versions?.electron ?? '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Chromium</td>
                      <td className="font-monospace">{versions?.chrome ?? '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Node.js</td>
                      <td className="font-monospace">{versions?.node ?? '—'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">V8</td>
                      <td className="font-monospace">{versions?.v8 ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'reset' && (
            <>
              <div className="mb-4">
                <label className="form-label">Einstellungen zurücksetzen</label>
                <div className="mb-2">
                  <button
                    className="btn btn-outline-danger"
                    onClick={async () => {
                      if (!window.confirm('Alle Einstellungen, Playlists und Presets wirklich zurücksetzen? Medien bleiben erhalten. Die App wird neu gestartet.')) return;
                      await window.electronAPI.resetSettings();
                    }}
                  >
                    Einstellungen zurücksetzen
                  </button>
                </div>
                <div className="form-text">Löscht alle Einstellungen, Playlists und Presets. Mediendateien bleiben erhalten.</div>
              </div>

              <div className="mb-4">
                <label className="form-label">Medien zurücksetzen</label>
                <div className="mb-2">
                  <button
                    className="btn btn-outline-danger"
                    onClick={async () => {
                      if (!window.confirm('Alle Mediendateien wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
                      await window.electronAPI.resetMedia();
                    }}
                  >
                    Medien zurücksetzen
                  </button>
                </div>
                <div className="form-text">Löscht alle hochgeladenen Medien (Bilder, Videos). Einstellungen und Playlists bleiben erhalten.</div>
              </div>

              <div className="mb-4">
                <label className="form-label">App zurücksetzen</label>
                <div className="mb-2">
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      if (!window.confirm('App wirklich vollständig zurücksetzen? Alle Daten (Einstellungen, Medien, Playlists) werden unwiderruflich gelöscht. Die App wird neu gestartet.')) return;
                      await window.electronAPI.resetApp();
                    }}
                  >
                    App zurücksetzen
                  </button>
                </div>
                <div className="form-text">Setzt die App vollständig zurück – löscht alle Einstellungen, Playlists, Presets und alle Mediendateien.</div>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
}

export default SettingsView;

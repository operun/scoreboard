import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { BsEye, BsEyeSlash, BsXCircle } from 'react-icons/bs';

function SettingsView() {
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        setServer(settings.server || '');
        setUsername(settings.username || '');
        setPassword(settings.password || '');
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
      }
      // Load image list for pickers
      const allMedia = await window.electronAPI.loadMedia();
      setMediaImages(allMedia.filter(m => m.type === 'image'));
    };
    loadSettings();

    // Load version info
    window.electronAPI.getVersions().then(setVersions);
  }, []);

  // Helper to save current state
  const saveAllSettings = (overrides = {}) => {
    const newSettings = {
      server,
      username,
      password,
      outputWidth,
      outputHeight,
      showCropMarks,
      themeMode,
      controllerVisibility,
      scoreboardBgId,
      scoreboardBgName,
      scoreboardSponsorId,
      scoreboardSponsorName,
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

  const handleConnectionChange = (changes) => {
    if ('server' in changes) setServer(changes.server);
    if ('username' in changes) setUsername(changes.username);
    if ('password' in changes) setPassword(changes.password);

    saveAllSettings(changes);
  }

  const handleVisibilityChange = (key, value) => {
    const newVisibility = { ...controllerVisibility, [key]: value };
    setControllerVisibility(newVisibility);
    saveAllSettings({ controllerVisibility: newVisibility });
  };

  const handleTestConnection = async () => {
    const result = await window.electronAPI.testConnection();
    if (result.status === 'ok') {
      toast.success(result.message);
    } else {
      toast.error(`${result.message}`);
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
              <p className="lead mb-4">Die Verbindungseinstellungen werden für die Synchronisation der Medien genutzt.</p>

              <div className="mb-4">
                <label className="form-label">Server</label>
                <input
                  type="text"
                  className="form-control"
                  value={server}
                  onChange={(e) => handleConnectionChange({ server: e.target.value })}
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Benutzername</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => handleConnectionChange({ username: e.target.value })}
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Passwort</label>
                <div className="input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={password}
                    onChange={(e) => handleConnectionChange({ password: e.target.value })}
                  />
                  <span
                    className="input-group-text"
                    role="button"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <BsEye /> : <BsEyeSlash />}
                  </span>
                </div>
              </div>

              <div className="d-flex mt-4 gap-2">
                <button className="btn btn-outline-primary" onClick={handleTestConnection}>
                  Verbindung testen
                </button>
              </div>
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
              <p className="lead mb-4">Löscht alle Einstellungen und Presets. Mediendateien bleiben erhalten. Die App wird danach neu gestartet.</p>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  if (!window.confirm('Alle Einstellungen und Presets wirklich zurücksetzen? Die App wird neu gestartet.')) return;
                  await window.electronAPI.resetApp();
                }}
              >
                App zurücksetzen
              </button>
            </>
          )}

        </div>
      </div>

    </div>
  );
}

export default SettingsView;

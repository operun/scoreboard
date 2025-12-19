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
  const [controllerVisibility, setControllerVisibility] = useState({
    warmup: true,
    countdown: true,
    scoreboard: true,
    halftime: true,
    end: true,
    goalHome: true,
    goalGuest: true,
    sub: true,
    yellow: true,
    red: true,
    var: true,
    announcement: true
  });

  const [activeTab, setActiveTab] = useState('output');
  const settingsRef = useState({})[0]; // Need a ref to hold full settings for partial updates if needed, or just re-read. Simpler: just reload on mount. 
  // Actually, let's keep it simple. We read all, set state. On save, we write state. 
  // BUT the tab "appearance" saves immediately in my previous snippet. 
  // Let's make sure loadSettings populates themeMode.

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await window.electronAPI.loadSettings();
      if (settings) {
        Object.assign(settingsRef, settings); // Sync ref
        setServer(settings.server || '');
        setUsername(settings.username || '');
        setPassword(settings.password || '');
        if (settings.outputWidth) setOutputWidth(settings.outputWidth);
        if (settings.outputHeight) setOutputHeight(settings.outputHeight);
        setShowCropMarks(settings.showCropMarks !== false);
        if (settings.customTestImageName) setCustomTestImageName(settings.customTestImageName);
        if (settings.themeMode) setThemeMode(settings.themeMode);
        if (settings.controllerVisibility) setControllerVisibility(prev => ({ ...prev, ...settings.controllerVisibility }));
      }
    };
    loadSettings();
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
            </>
          )}

          {activeTab === 'connection' && (
            <>
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
                    { key: 'countdown', label: 'Countdown' },
                    { key: 'scoreboard', label: 'Spielstand' },
                    { key: 'halftime', label: 'Halbzeit' },
                    { key: 'end', label: 'Abpfiff' },
                    { key: 'goalHome', label: 'Tor Heim' },
                    { key: 'goalGuest', label: 'Tor Gast' },
                    { key: 'sub', label: 'Wechsel' },
                    { key: 'yellow', label: 'Gelbe Karte' },
                    { key: 'red', label: 'Rote Karte' },
                    { key: 'var', label: 'VAR Check' },
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

        </div>
      </div>
    </div >
  );
}

export default SettingsView;

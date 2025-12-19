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
      }
    };
    loadSettings();
  }, []);

  const saveAllSettings = () => {
    const newSettings = { server, username, password, outputWidth, outputHeight, showCropMarks, themeMode };
    Object.assign(settingsRef, newSettings);
    window.electronAPI.saveSettings(newSettings);
  };

  const handleSaveOutput = () => {
    saveAllSettings();
    toast.success('Einstellungen gespeichert');
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

      </div>


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
                      onChange={(e) => setOutputWidth(parseInt(e.target.value) || 1280)}
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
                      onChange={(e) => setOutputHeight(parseInt(e.target.value) || 720)}
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
                  onChange={(e) => setShowCropMarks(e.target.checked)}
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

              <div className="d-flex">
                <button className="btn btn-outline-primary" onClick={handleSaveOutput}>
                  Speichern
                </button>
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
                  onChange={(e) => setServer(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Benutzername</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Passwort</label>
                <div className="input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <button className="btn btn-outline-primary" onClick={() => {
                  saveAllSettings();
                  toast.success('Einstellungen gespeichert');
                }}>
                  Speichern
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
                    const newSettings = { ...settingsRef.current, themeMode: newMode };
                    Object.assign(settingsRef, newSettings); // Update ref immediately
                    window.electronAPI.saveSettings(newSettings);

                    // Delay toast slightly so it picks up the new theme
                    setTimeout(() => {
                      toast.success('Design-Modus gespeichert');
                    }, 50);
                  }}
                >
                  <option value="system">System (Auto)</option>
                  <option value="light">Hell</option>
                  <option value="dark">Dunkel</option>
                </select>
                <div className="form-text">
                  Wähle zwischen hellem und dunklem Design oder folge der Systemeinstellung.
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default SettingsView;

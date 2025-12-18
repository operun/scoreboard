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

  const [activeTab, setActiveTab] = useState('output');

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await window.electronAPI.loadSettings();
      if (settings) {
        setServer(settings.server || '');
        setUsername(settings.username || '');
        setPassword(settings.password || '');
        if (settings.outputWidth) setOutputWidth(settings.outputWidth);
        if (settings.outputHeight) setOutputHeight(settings.outputHeight);
        setShowCropMarks(settings.showCropMarks !== false); // Default true
        if (settings.customTestImageName) setCustomTestImageName(settings.customTestImageName);
      }
    };
    loadSettings();
  }, []);

  const saveAllSettings = () => {
    window.electronAPI.saveSettings({ server, username, password, outputWidth, outputHeight, showCropMarks });
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
      <h1>Settings</h1>
      <p className="lead mb-4">Verwaltung der Anwendungseinstellungen und Verbindungsdaten.</p>

      <div className="row">
        <div className="col-md-8 col-lg-6">

          <ul className="nav nav-underline mb-4">
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
          </ul>

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

        </div>
      </div>
    </div>
  );
}

export default SettingsView;

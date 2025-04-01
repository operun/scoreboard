import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { BsEye, BsEyeSlash } from 'react-icons/bs';

function SettingsView() {
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await window.electronAPI.loadSettings();
      if (settings) {
        setServer(settings.server || '');
        setUsername(settings.username || '');
        setPassword(settings.password || '');
      }
    };
    loadSettings();
  }, []);

  const handleSave = () => {
    window.electronAPI.saveSettings({ server, username, password });
    toast.success('Gespeichert');
    setTimeout(handleTestConnection, 300);
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
      <p className="lead mb-4">Cras justo odio, dapibus ac facilisis in, egestas eget quam. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Donec sed odio dui. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>

      <div className="row">
        <div className="col-md-8 col-lg-6">
          <h2 className="mb-3">Anmeldedaten</h2>

          <div className="mb-3">
            <label className="form-label">Server</label>
            <input
              type="text"
              className="form-control"
              value={server}
              onChange={(e) => setServer(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Benutzername</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="mb-3">
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

          <div className="d-flex justify-content-end">
            <button className="btn btn-primary" onClick={handleSave}>
              Speichern
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SettingsView;

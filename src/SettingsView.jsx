import { useState } from 'react';

function SettingsView() {
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSave = () => {
    window.electronAPI.saveSettings({ server, username, password });
  };

  return (
    <div className="container py-4">
      <h1 className="mb-4">Settings</h1>

      <div className="row">
        <div className="col-md-8 offset-md-2 col-lg-6 offset-lg-3">
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
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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

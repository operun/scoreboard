import { useState } from 'react';

function SettingsView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSave = () => {
    console.log('Save:', { username, password });
  };

  return (
    <div className="container">
      <h1 className="mb-3">Settings</h1>

      <div className="mb-3">
        <label className="form-label">Username</label>
        <input
          type="text"
          className="form-control"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        Save
      </button>
    </div>
  );
}

export default SettingsView;

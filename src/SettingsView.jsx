import { useState } from 'react';

function SettingsView() {
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSave = () => {
    console.log('Save:', { username, password });
  };

  return (
    <div className="container">

      <div className="row">
        <div className="col">

          <h1>Settings</h1>

          <p className="lead mb-5">
            Nullam id dolor id nibh ultricies vehicula ut id elit. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Cras justo odio, dapibus ac facilisis in, egestas eget quam. Etiam porta sem malesuada magna mollis euismod.
          </p>

          <div class="row">

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

          </div>

        </div>

      </div>
    </div>

  );
}

export default SettingsView;

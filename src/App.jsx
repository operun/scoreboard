import { ToastContainer, toast } from 'react-toastify';
import { useState } from 'react';
import ControllerView from './ControllerView';
import PlaylistsView from './PlaylistsView';
import EditPlaylistView from './EditPlaylistView';
import MediaView from './MediaView';
import SettingsView from './SettingsView';
import Sidebar from './Sidebar';
import './styles/bootstrap.scss';
import 'react-toastify/dist/ReactToastify.css';

import OutputView from './OutputView';

function App() {
  const [view, setView] = useState('media');
  const [editPlaylistId, setEditPlaylistId] = useState(null);

  // Check if we are running as the output window
  const isOutputWindow = window.location.hash === '#/output';

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const color_mode = prefersDark ? 'dark' : 'light';

  const handleSync = async () => {
    const toastId = toast.loading("Synchronisation gestartet.");

    try {
      const res = await window.electronAPI.syncToRemote();

      if (res.status === 'ok') {
        toast.update(toastId, { render: res.message, type: "success", isLoading: false, autoClose: 5000 });
      } else {
        toast.update(toastId, { render: "Fehler: " + res.message, type: "error", isLoading: false, autoClose: 8000 });
      }
    } catch (e) {
      toast.update(toastId, { render: "Systemfehler beim Sync.", type: "error", isLoading: false, autoClose: 5000 });
      console.error(e);
    }
  };

  if (isOutputWindow) {
    return <OutputView />;
  }

  return (
    <div className="app">

      <div className="d-flex position-relative">

        <div className="sidebar d-flex flex-column text-white vh-100">
          <Sidebar activeView={view} onChangeView={(newView) => {
            if (newView === 'sync') {
              handleSync();
            } else {
              setView(newView);
            }
          }} />
        </div>

        <div className="main flex-fill p-5" style={{ height: '100vh', overflow: 'hidden' }}>
          {view === 'controller' && <ControllerView />}
          {view === 'playlists' && (
            <PlaylistsView
              onEdit={(id) => {
                setEditPlaylistId(id);
                setView('edit-playlist');
              }}
            />
          )}
          {view === 'edit-playlist' && editPlaylistId && (
            <EditPlaylistView
              playlistId={editPlaylistId}
              onBack={() => {
                setEditPlaylistId(null);
                setView('playlists');
              }}
            />
          )}
          {view === 'media' && <MediaView />}
          {view === 'settings' && <SettingsView />}
        </div>

      </div>

      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        theme={color_mode}
      />

    </div>

  );
}

export default App;

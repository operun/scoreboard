import { ToastContainer, toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import SideBar from './components/SideBar';
import ControllerView from './ControllerView';
import PlaylistsView from './PlaylistsView';
import EditPlaylistView from './EditPlaylistView';
import MediaView from './MediaView';
import SettingsView from './SettingsView';
import './styles/bootstrap.scss';
import 'react-toastify/dist/ReactToastify.css';

import OutputView from './OutputView';

function App() {
  const [view, setView] = useState('controller');
  const [editPlaylistId, setEditPlaylistId] = useState(null);

  // Check if we are running as the output window
  const isOutputWindow = window.location.hash === '#/output';

  // --- Theme Logic ---
  // Default to system
  const [themeMode, setThemeMode] = useState('system');
  const [effectiveTheme, setEffectiveTheme] = useState('light');
  const [controllerVisibility, setControllerVisibility] = useState({
    warmup: true, lineup: true, halftime: true, end: true,
    goalHome: true, goalGuest: true, sub: true, yellow: true, red: true,
    var: true, special: true, corner: true, overtime: true, announcement: true
  });

  // Load theme setting on mount
  useEffect(() => {
    window.electronAPI.loadSettings().then(s => {
      if (s && s.themeMode) setThemeMode(s.themeMode);
      if (s && s.controllerVisibility) setControllerVisibility(prev => ({ ...prev, ...s.controllerVisibility }));
    });

    // Listen for updates from settings view
    const unsub = window.electronAPI.onSettingsUpdated((err, s) => {
      if (!err && s.themeMode) setThemeMode(s.themeMode);
      if (!err && s.controllerVisibility) setControllerVisibility(prev => ({ ...prev, ...s.controllerVisibility }));
    });
    return () => { if (unsub) unsub(); };
  }, []);

  // Calculate effective theme
  // We need to listen to system changes if mode is system
  useEffect(() => {
    const handleSystemChange = (e) => {
      if (themeMode === 'system') {
        setEffectiveTheme(e.matches ? 'dark' : 'light');
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);

    // Initial check or update on themeMode change
    if (themeMode === 'system') {
      setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
    } else {
      setEffectiveTheme(themeMode);
    }

    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', effectiveTheme);
  }, [effectiveTheme]);

  const color_mode = effectiveTheme;
  // -------------------

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
    return (
      <>
        <TitleBar title="Output" />
        <div style={{ paddingTop: '30px', height: '100vh', boxSizing: 'border-box', backgroundColor: '#000', color: '#fff' }}>
          <OutputView />
        </div>
      </>
    );
  }

  return (
    <div className="app">
      <TitleBar title="Scoreboard" />
      <div className="d-flex position-relative" style={{ paddingTop: '35px', height: '100vh', boxSizing: 'border-box' }}>

        <div className="sidebar d-flex flex-column border-end bg-body-tertiary" style={{ height: 'calc(100vh - 35px)', width: '60px' }}>
          <SideBar activeView={view} onChangeView={(newView) => {
            if (newView === 'sync') {
              handleSync();
            } else {
              setView(newView);
            }
          }} />
        </div>

        <div className="main flex-fill p-5" style={{ height: '100%', overflow: 'hidden' }}>
          {/* ControllerView is always mounted to preserve game state across navigation */}
          <div style={{ display: view === 'controller' ? 'block' : 'none', height: '100%' }}>
            <ControllerView visibility={controllerVisibility} />
          </div>
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

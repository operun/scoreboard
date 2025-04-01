import { ToastContainer } from 'react-toastify';
import { useState } from 'react';
import ControllerView from './ControllerView';
import MediaView from './MediaView';
import SettingsView from './SettingsView';
import Sidebar from './Sidebar';
import './styles/bootstrap.scss';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [view, setView] = useState('controller');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const color_mode = prefersDark ? 'dark' : 'light';

  return (
    <div className="app">

      <div className="d-flex position-relative">

        <div className="sidebar d-flex flex-column text-white vh-100">
          <Sidebar activeView={view} onChangeView={setView} />
        </div>

        <div className="main flex-fill p-5">
          {view === 'controller' && <ControllerView />}
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

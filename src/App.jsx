import { useState } from 'react';
import Sidebar from './Sidebar';
import ControllerView from './ControllerView';
import MediaView from './MediaView';
import SettingsView from './SettingsView';
import TitleBar from './TitleBar';
import './styles/bootstrap.scss';

function App() {
  const [view, setView] = useState('controller');

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

    </div>

  );
}

export default App;

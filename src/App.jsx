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
      <TitleBar />
      <div className="d-flex position-relative">
        <div className="sidebar d-flex flex-column bg-black text-white vh-100">
          <Sidebar activeView={view} onChangeView={setView} />
        </div>
        <div className="flex-fill mx-5" style={{marginTop: '75px'}}>
          {view === 'controller' && <ControllerView />}
          {view === 'media' && <MediaView />}
          {view === 'settings' && <SettingsView />}
        </div>
      </div>

    </div>

  );
}

export default App;

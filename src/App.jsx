import { useState } from 'react';
import Sidebar from './Sidebar';
import ControllerView from './ControllerView';
import MediaView from './MediaView';
import SettingsView from './SettingsView';

import './styles/bootstrap.scss';

function App() {
  const [view, setView] = useState('controller');

  return (
    <div className="d-flex h-100">
      <Sidebar activeView={view} onChangeView={setView} />

      <div className="flex-grow-1 p-4">
        {view === 'controller' && <ControllerView />}
        {view === 'media' && <MediaView />}
        {view === 'settings' && <SettingsView />}
      </div>
    </div>
  );
}

export default App;

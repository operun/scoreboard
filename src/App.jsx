import { useState } from 'react';
import Sidebar from './Sidebar';
import SettingsView from './SettingsView';
import './App.scss';

function App() {
  const [view, setView] = useState('settings');

  return (
    <div className="d-flex">
      <Sidebar activeView={view} onChangeView={setView} />
      <div className="main flex-grow-1 p-4">
        {view === 'settings' && <SettingsView />}
      </div>
    </div>
  );
}

export default App;

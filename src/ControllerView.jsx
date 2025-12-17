import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { BsPlayCircle, BsStopCircle, BsClock, BsSave, BsUpload } from "react-icons/bs";

function ControllerView() {
  const [playlists, setPlaylists] = useState([]);
  const [presets, setPresets] = useState([]);
  const [currentPresetId, setCurrentPresetId] = useState('new');

  // Game State (part of preset)
  const [gameState, setGameState] = useState({
    homeScore: 0,
    guestScore: 0,
    kickoffTime: '',
    standardPlaylistId: '',
    half: 1 // 1 or 2
  });

  useEffect(() => {
    const loadData = async () => {
      const pl = await window.electronAPI.loadPlaylists();
      setPlaylists(pl);

      const pr = await window.electronAPI.loadPresets();
      setPresets(pr);

      if (pr.length > 0) {
        // Load first preset by default
        loadPreset(pr[0]);
      }
    };
    loadData();
  }, []);

  const loadPreset = (preset) => {
    setCurrentPresetId(preset.id);
    setGameState({
      homeScore: preset.homeScore || 0,
      guestScore: preset.guestScore || 0,
      kickoffTime: preset.kickoffTime || '',
      standardPlaylistId: preset.standardPlaylistId || '',
      half: preset.half || 1
    });
  };

  const handleSavePreset = async () => {
    const id = currentPresetId === 'new' ? crypto.randomUUID() : currentPresetId;
    const name = prompt("Name für das Preset:", "Standard Fußball");
    if (!name) return;

    const newPreset = {
      id,
      name,
      ...gameState
    };

    await window.electronAPI.savePreset(newPreset);
    setPresets(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newPreset;
        return copy;
      }
      return [...prev, newPreset];
    });
    setCurrentPresetId(id);
    toast.success("Preset gespeichert");
  };

  const updateState = (field, value) => {
    setGameState(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container-fluid h-100 d-flex flex-column">

      {/* Main Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h1 className="m-0">Regie</h1>
          <p className="lead m-0 text-muted">Steuerung für Anzeigetafel & Videowall</p>
        </div>

        <div className="d-flex gap-2">
          <select
            className="form-select"
            style={{ minWidth: 200 }}
            value={currentPresetId}
            onChange={(e) => {
              if (e.target.value === 'new') {
                setCurrentPresetId('new');
                setGameState({ homeScore: 0, guestScore: 0, kickoffTime: '', standardPlaylistId: '', half: 1 });
              } else {
                const p = presets.find(pr => pr.id === e.target.value);
                if (p) loadPreset(p);
              }
            }}
          >
            <option value="new">Neues Preset...</option>
            {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-outline-primary" onClick={handleSavePreset} title="Preset speichern">
            <BsSave />
          </button>
        </div>
      </div>

      <div className="row flex-fill">

        {/* SETUP COLUMN */}
        <div className="col-md-4 pe-4 border-end">
          <h4 className="mb-4">Setup</h4>

          <div className="mb-4">
            <label className="form-label text-muted text-uppercase small fw-bold">Standard-Playlist (Loop)</label>
            <select
              className="form-select mb-2"
              value={gameState.standardPlaylistId}
              onChange={(e) => updateState('standardPlaylistId', e.target.value)}
            >
              <option value="">Keine ausgewählt</option>
              {playlists.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <button className="btn btn-outline-primary w-100" disabled={!gameState.standardPlaylistId}>
              <BsPlayCircle className="me-2" /> Loop Starten
            </button>
          </div>

          <hr className="my-4 text-muted" />

          <div className="mb-4">
            <label className="form-label text-muted text-uppercase small fw-bold">Anstoßzeit</label>
            <input
              type="time"
              className="form-control"
              value={gameState.kickoffTime}
              onChange={(e) => updateState('kickoffTime', e.target.value)}
            />
          </div>
        </div>

        {/* MATCH CONTROL COLUMN */}
        <div className="col-md-4 px-4 border-end">
          <h4 className="mb-4">Spielstand</h4>

          <div className="d-flex justify-content-center align-items-center mb-5">
            <div className="text-center">
              <label className="form-label text-muted small">Heim</label>
              <input
                type="number"
                className="form-control form-control-lg text-center fw-bold border-primary"
                style={{ width: 80, fontSize: '1.8rem', height: 60 }}
                value={gameState.homeScore}
                onChange={(e) => updateState('homeScore', parseInt(e.target.value))}
              />
            </div>
            <span className="fs-2 mx-3 text-muted">:</span>
            <div className="text-center">
              <label className="form-label text-muted small">Gast</label>
              <input
                type="number"
                className="form-control form-control-lg text-center fw-bold border-primary"
                style={{ width: 80, fontSize: '1.8rem', height: 60 }}
                value={gameState.guestScore}
                onChange={(e) => updateState('guestScore', parseInt(e.target.value))}
              />
            </div>
          </div>

          <h4 className="mb-4 mt-5">Zeitnehmung</h4>
          <div className="d-grid gap-3">
            <button className="btn btn-outline-primary">
              Anpfiff {gameState.half}. HZ
            </button>
            <button className="btn btn-outline-primary">
              Halbzeit / Abpfiff
            </button>
            <div className="btn-group mt-2">
              <input
                type="radio"
                className="btn-check"
                name="half" id="h1"
                autoComplete="off"
                checked={gameState.half === 1}
                onChange={() => updateState('half', 1)}
              />
              <label className="btn btn-outline-primary" htmlFor="h1">1. HZ</label>

              <input
                type="radio"
                className="btn-check"
                name="half" id="h2"
                autoComplete="off"
                checked={gameState.half === 2}
                onChange={() => updateState('half', 2)}
              />
              <label className="btn btn-outline-primary" htmlFor="h2">2. HZ</label>
            </div>
          </div>
        </div>

        {/* ACTIONS / SCENES COLUMN */}
        <div className="col-md-4 ps-4">
          <h4 className="mb-4">Szenen & Overlays</h4>
          <p className="text-muted small mb-4">Aktionen unterbrechen den Standard-Loop kurzzeitig.</p>

          <div className="d-grid gap-3">
            <button className="btn btn-outline-primary fw-bold">
              TOR-Animation
            </button>
            <div className="row g-2">
              <div className="col">
                <button className="btn btn-outline-primary w-100">
                  Wechsel
                </button>
              </div>
              <div className="col">
                <button className="btn btn-outline-primary w-100">
                  Gelbe Karte
                </button>
              </div>
            </div>
            <button className="btn btn-outline-primary">
              VAR Check
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ControllerView;

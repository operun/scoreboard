import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { BsPlayCircle, BsStopCircle, BsClock, BsSave, BsUpload } from "react-icons/bs";

// Helper Component defined outside to prevent re-mounting on parent re-renders
const PlaylistSelect = ({ label, value, onChange, playlists }) => (
  <div className="mb-2">
    <label className="form-label text-muted small fw-bold mb-1">{label}</label>
    <select
      className="form-select form-select-sm"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">-- Ignorieren --</option>
      {playlists.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
    </select>
  </div>
);

function ControllerView() {
  const [playlists, setPlaylists] = useState([]);

  const [presets, setPresets] = useState([]);
  const [currentPresetId, setCurrentPresetId] = useState('new');

  // Game State (part of preset)
  const [gameState, setGameState] = useState({
    // Scores (Live)
    homeScore: 0,
    guestScore: 0,

    // Timer / Match State
    matchState: 'PRE_GAME', // PRE_GAME, FIRST_HALF, HALF_TIME, SECOND_HALF, POST_GAME
    timerStart: null, // Timestamp when timer started
    timerOffset: 0,   // Offset in seconds (e.g. 2700 for 2nd half)
    timerRunning: false,

    // Playlist Mappings (IDs)
    plSponsors: '',
    plCountdown: '',
    plKickoff: '', // Anpfiff Hintergrund
    plHalfTime: '',
    plEnd: '',     // Abpfiff
    plGoalHome: '',
    plGoalGuest: '',
    plSub: '',
    plYellow: '',
    plRed: '',
    plVar: '',
    plAnnouncement: ''
  });

  // Local Score State (for editing before "Übernehmen")
  const [localScore, setLocalScore] = useState({ home: 0, guest: 0 });

  // Sync local score when preset loaded or external update
  useEffect(() => {
    setLocalScore({ home: gameState.homeScore, guest: gameState.guestScore });
  }, [gameState.homeScore, gameState.guestScore]);

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
    setGameState(prev => ({
      ...prev,
      ...preset,
      // Ensure we keep defaults if preset misses new fields
      plSponsors: preset.plSponsors || '',
      plCountdown: preset.plCountdown || '',
      plKickoff: preset.plKickoff || '',
      plHalfTime: preset.plHalfTime || '',
      plEnd: preset.plEnd || '',
      plGoalHome: preset.plGoalHome || '',
      plGoalGuest: preset.plGoalGuest || '',
      plSub: preset.plSub || '',
      plYellow: preset.plYellow || '',
      plRed: preset.plRed || '',
      plVar: preset.plVar || '',
      plAnnouncement: preset.plAnnouncement || ''
    }));
  };

  // Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState("");

  const handleSaveClick = () => {
    // Pre-fill name
    if (currentPresetId !== 'new') {
      const current = presets.find(p => p.id === currentPresetId);
      if (current) setPresetName(current.name);
    } else {
      setPresetName("Standard Fußball");
    }
    setShowSaveModal(true);
  };

  const confirmSave = async () => {
    if (!presetName) return;

    const id = currentPresetId === 'new' ? crypto.randomUUID() : currentPresetId;

    const newPreset = {
      id,
      name: presetName,
      ...gameState
    };

    try {
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
      toast.success(`Preset "${presetName}" gespeichert`);
      setShowSaveModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Fehler beim Speichern");
    }
  };

  const updateState = (field, value) => {
    setGameState(prev => ({ ...prev, [field]: value }));
  };

  const commitScore = () => {
    updateState('homeScore', localScore.home);
    updateState('guestScore', localScore.guest);
    toast.info("Spielstand aktualisiert");
  };

  // --- MATCH CONTROL LOGIC ---
  const startMatchState = (state) => {
    const updates = { matchState: state };
    let plToPlay = null;

    if (state === 'FIRST_HALF') {
      updates.timerRunning = true;
      updates.timerStart = Date.now();
      updates.timerOffset = 0;
      plToPlay = gameState.plKickoff;
    } else if (state === 'HALF_TIME') {
      updates.timerRunning = false;
      plToPlay = gameState.plHalfTime;
    } else if (state === 'SECOND_HALF') {
      updates.timerRunning = true;
      updates.timerStart = Date.now();
      updates.timerOffset = 45 * 60; // 45 min
      plToPlay = gameState.plKickoff;
    } else if (state === 'POST_GAME') {
      updates.timerRunning = false;
      plToPlay = gameState.plEnd;
    }

    setGameState(prev => ({ ...prev, ...updates }));

    // Trigger Playlist if configured
    if (plToPlay) {
      const pl = playlists.find(p => p.id === plToPlay);
      if (pl) {
        window.electronAPI.sendControlCommand('PLAY_PLAYLIST', {
          playlist: pl,
          mode: (state === 'FIRST_HALF' || state === 'SECOND_HALF') ? 'BACKGROUND' : 'FULL' // Background during game
        });
      }
    }
  };

  const triggerScene = (plId) => {
    if (!plId) {
      toast.warn("Keine Playlist für diese Szene ausgewählt!");
      return;
    }
    const pl = playlists.find(p => p.id === plId);
    if (pl) {
      window.electronAPI.sendControlCommand('SHOW_SCENE', pl);
    } else {
      toast.error("Playlist nicht gefunden");
    }
  };

  // Generic Control Command Sender (Live Game State)
  useEffect(() => {
    if (currentPresetId !== 'new' || gameState.homeScore > 0) {
      window.electronAPI.sendControlCommand('UPDATE_GAME_STATE', gameState);
    }
  }, [gameState]);


  // Timer Logic for Controller Display
  const [timerString, setTimerString] = useState("00:00");
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    const updateTimer = () => {
      if (gameState.timerRunning && gameState.timerStart) {
        const now = Date.now();
        const diffSec = Math.floor((now - gameState.timerStart) / 1000);
        const totalSec = gameState.timerOffset + diffSec;
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        setTimerString(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      } else {
        const totalSec = gameState.timerOffset;
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        setTimerString(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };

    if (gameState.timerRunning) {
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    }
    updateTimer(); // Initial call

    return () => clearInterval(timerIntervalRef.current);
  }, [gameState.timerRunning, gameState.timerStart, gameState.timerOffset]);


  return (
    <div className="container-fluid h-100 d-flex flex-column position-relative">

      {/* HEADER (Same as before) */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div><h1 className="m-0">Regie</h1><p className="lead m-0 text-muted">Steuerung</p></div>
        <div className="d-flex gap-2">
          <select className="form-select" style={{ minWidth: 200 }} value={currentPresetId} onChange={(e) => {
            if (e.target.value === 'new') {
              setCurrentPresetId('new');
              // Reset to defaults
              setGameState(prev => ({
                homeScore: 0, guestScore: 0,
                matchState: 'PRE_GAME', timerStart: null, timerOffset: 0, timerRunning: false,
                plSponsors: '', plCountdown: '', plKickoff: '', plHalfTime: '', plEnd: '',
                plGoalHome: '', plGoalGuest: '', plSub: '', plYellow: '', plRed: '', plVar: '', plAnnouncement: ''
              }));
            } else {
              const p = presets.find(pr => pr.id === e.target.value);
              if (p) loadPreset(p);
            }
          }}>
            <option value="new">Neues Preset...</option>
            {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-outline-primary" onClick={handleSaveClick}><BsSave /></button>
        </div>
      </div>

      <div className="row flex-fill overflow-hidden">

        {/* SETUP COLUMN (Scrollable) */}
        <div className="col-md-3 pe-3 border-end overflow-auto h-100 pb-5">
          <h4 className="mb-3">Playlists Zuordnung</h4>
          <PlaylistSelect label="Sponsoren (Basis)" value={gameState.plSponsors} onChange={v => updateState('plSponsors', v)} playlists={playlists} />
          <PlaylistSelect label="Countdown" value={gameState.plCountdown} onChange={v => updateState('plCountdown', v)} playlists={playlists} />
          <PlaylistSelect label="Anpfiff (Background)" value={gameState.plKickoff} onChange={v => updateState('plKickoff', v)} playlists={playlists} />
          <PlaylistSelect label="Halbzeit" value={gameState.plHalfTime} onChange={v => updateState('plHalfTime', v)} playlists={playlists} />
          <PlaylistSelect label="Abpfiff" value={gameState.plEnd} onChange={v => updateState('plEnd', v)} playlists={playlists} />
          <hr />
          <PlaylistSelect label="Tor Heim" value={gameState.plGoalHome} onChange={v => updateState('plGoalHome', v)} playlists={playlists} />
          <PlaylistSelect label="Tor Gast" value={gameState.plGoalGuest} onChange={v => updateState('plGoalGuest', v)} playlists={playlists} />
          <hr />
          <PlaylistSelect label="Wechsel" value={gameState.plSub} onChange={v => updateState('plSub', v)} playlists={playlists} />
          <PlaylistSelect label="Gelbe Karte" value={gameState.plYellow} onChange={v => updateState('plYellow', v)} playlists={playlists} />
          <PlaylistSelect label="Rote Karte" value={gameState.plRed} onChange={v => updateState('plRed', v)} playlists={playlists} />
          <PlaylistSelect label="VAR Check" value={gameState.plVar} onChange={v => updateState('plVar', v)} playlists={playlists} />
          <PlaylistSelect label="Durchsage" value={gameState.plAnnouncement} onChange={v => updateState('plAnnouncement', v)} playlists={playlists} />
        </div>

        {/* CENTER COLUMN: LIVE CONTROL */}
        <div className="col-md-6 px-3 border-end overflow-auto h-100">
          <h4 className="mb-4 text-center">Match Control</h4>

          {/* SCORE & TIME */}
          <div className="d-flex flex-column align-items-center mb-4">
            <div className="d-flex justify-content-center align-items-center mb-2">
              <div className="d-flex flex-column align-items-center gap-2">
                <label>Heim</label>
                <div className="d-flex align-items-center gap-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setLocalScore(s => ({ ...s, home: Math.max(0, s.home - 1) }))}>-</button>
                  <input className="form-control text-center fs-2 fw-bold" style={{ width: 80, height: 60 }} value={localScore.home} readOnly />
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setLocalScore(s => ({ ...s, home: s.home + 1 }))}>+</button>
                </div>
              </div>
              <div className="fs-2 mx-4">:</div>
              <div className="d-flex flex-column align-items-center gap-2">
                <label>Gast</label>
                <div className="d-flex align-items-center gap-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setLocalScore(s => ({ ...s, guest: Math.max(0, s.guest - 1) }))}>-</button>
                  <input className="form-control text-center fs-2 fw-bold" style={{ width: 80, height: 60 }} value={localScore.guest} readOnly />
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setLocalScore(s => ({ ...s, guest: s.guest + 1 }))}>+</button>
                </div>
              </div>
            </div>

            {/* TIMER DISPLAY */}
            <div className="h2 font-monospace my-2">{timerString}</div>

            <div className="text-center mt-3 mb-4">
              <button className="btn btn-primary px-5" onClick={commitScore}>Übernehmen</button>
            </div>
          </div>

          <hr />

          {/* PHASES */}
          <div className="row g-3">
            <div className="col-6">
              <button className="btn btn-outline-primary w-100 py-3" onClick={() => startMatchState('FIRST_HALF')}>
                Anpfiff 1. Halbzeit
              </button>
            </div>
            <div className="col-6">
              <button className="btn btn-outline-primary w-100 py-3" onClick={() => startMatchState('HALF_TIME')}>
                Abpfiff 1. Halbzeit
              </button>
            </div>
            <div className="col-6">
              <button className="btn btn-outline-primary w-100 py-3" onClick={() => startMatchState('SECOND_HALF')}>
                Anpfiff 2. Halbzeit
              </button>
            </div>
            <div className="col-6">
              <button className="btn btn-outline-primary w-100 py-3" onClick={() => startMatchState('POST_GAME')}>
                Abpfiff 2. Halbzeit
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SCENES */}
        <div className="col-md-3 ps-3 overflow-auto h-100">
          <h4 className="mb-3">Szenen</h4>
          <div className="d-grid gap-2">
            <button className="btn btn-outline-primary mb-4" onClick={() => {
              const pl = playlists.find(p => p.id === gameState.plSponsors);
              if (pl) window.electronAPI.sendControlCommand('PLAY_PLAYLIST', { playlist: pl, mode: 'FULL' });
            }}>
              Aktivieren (Sponsoren)
            </button>

            <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plGoalHome)}>Tor Heim</button>
            <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plGoalGuest)}>Tor Gast</button>

            <hr />

            <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plSub)}>Wechsel</button>
            <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plYellow)}>Gelbe Karte</button>
            <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plRed)}>Rote Karte</button>
            <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plVar)}>VAR Check</button>
            <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plAnnouncement)}>Durchsage</button>
          </div>
        </div>

      </div>

      {/* SAVE PRESET MODAL */}
      {showSaveModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Preset speichern</h5>
                <button type="button" className="btn-close" onClick={() => setShowSaveModal(false)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Name des Presets</label>
                <input
                  type="text"
                  className="form-control"
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>Abbrechen</button>
                <button type="button" className="btn btn-primary" onClick={confirmSave}>Speichern</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ControllerView;

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { BsFloppy } from "react-icons/bs";

// Helper Component defined outside to prevent re-mounting on parent re-renders
const PlaylistSelect = ({ label, value, onChange, playlists }) => (
  <div className="mb-2">
    <label className="form-label text-muted small ms-1 mb-1">{label}</label>
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
    plWarmup: '',
    plCountdown: '',
    plScoreboard: '', // Hintergrund (Spielstand)
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
      // Always reset volatile timer state on load
      timerRunning: false,
      timerStart: null,
      timerOffset: 0,

      // Ensure we keep defaults if preset misses new fields
      plWarmup: preset.plWarmup || preset.plDefault || preset.plSponsors || '',
      plCountdown: preset.plCountdown || '',
      plScoreboard: preset.plScoreboard || preset.plBackground || preset.plKickoff || '',
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

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");

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
      ...gameState,
      // Do not save timer running state (prevents huge timer on reload)
      timerRunning: false,
      timerStart: null,
      timerOffset: 0
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
  // --- MATCH CONTROL LOGIC ---
  const startMatchState = (state) => {
    const updates = { matchState: state };
    let plToPlay = null;

    if (state === 'FIRST_HALF') {
      updates.timerRunning = true;
      updates.timerStart = Date.now();
      updates.timerOffset = 0;
      plToPlay = gameState.plScoreboard;
    } else if (state === 'HALF_TIME') {
      updates.timerRunning = false;
      plToPlay = gameState.plHalfTime;
    } else if (state === 'SECOND_HALF') {
      updates.timerRunning = true;
      updates.timerStart = Date.now();
      updates.timerOffset = 45 * 60; // 45 min
      plToPlay = gameState.plScoreboard;
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

  const handleAnnouncement = () => {
    if (gameState.plAnnouncement) {
      triggerScene(gameState.plAnnouncement);
    }
    window.electronAPI.sendControlCommand('SHOW_ANNOUNCEMENT', { message: announcementText });
    setShowAnnouncementModal(false);
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
  const isEditingTimerRef = useRef(false);

  const handleTimerBlur = () => {
    isEditingTimerRef.current = false;
    const parts = timerString.split(':');
    let m = 0, s = 0;
    if (parts.length === 2) {
      m = parseInt(parts[0], 10) || 0;
      s = parseInt(parts[1], 10) || 0;
    } else {
      m = parseInt(timerString, 10) || 0;
    }
    const newTotal = (m * 60) + s;

    setGameState(prev => ({
      ...prev,
      timerOffset: newTotal,
      timerStart: prev.timerRunning ? Date.now() : null
    }));
  };

  useEffect(() => {
    const updateTimer = () => {
      if (isEditingTimerRef.current) return;

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
    <div className="container-fluid d-flex flex-column position-relative" style={{ height: '100%', overflow: 'hidden' }}>

      <div className="row flex-fill overflow-hidden">

        {/* SETUP COLUMN (Scrollable) */}
        <div className="col-md-3 pe-4 h-100" style={{ overflowY: 'auto', overflowX: 'hidden' }}>

          <h5 className="mb-2 text-center">Zuordnung</h5>

          <div className="mb-4">
            <PlaylistSelect label="Warmup" value={gameState.plWarmup} onChange={v => updateState('plWarmup', v)} playlists={playlists} />
            <PlaylistSelect label="Countdown" value={gameState.plCountdown} onChange={v => updateState('plCountdown', v)} playlists={playlists} />
            <PlaylistSelect label="Spielstand" value={gameState.plScoreboard} onChange={v => updateState('plScoreboard', v)} playlists={playlists} />
            <PlaylistSelect label="Halbzeit" value={gameState.plHalfTime} onChange={v => updateState('plHalfTime', v)} playlists={playlists} />
            <PlaylistSelect label="Abpfiff" value={gameState.plEnd} onChange={v => updateState('plEnd', v)} playlists={playlists} />
          </div>

          <div className="mb-4">
            <PlaylistSelect label="Tor Heim" value={gameState.plGoalHome} onChange={v => updateState('plGoalHome', v)} playlists={playlists} />
            <PlaylistSelect label="Tor Gast" value={gameState.plGoalGuest} onChange={v => updateState('plGoalGuest', v)} playlists={playlists} />
          </div>

          <div className="mb-4">
            <PlaylistSelect label="Wechsel" value={gameState.plSub} onChange={v => updateState('plSub', v)} playlists={playlists} />
            <PlaylistSelect label="Gelbe Karte" value={gameState.plYellow} onChange={v => updateState('plYellow', v)} playlists={playlists} />
            <PlaylistSelect label="Rote Karte" value={gameState.plRed} onChange={v => updateState('plRed', v)} playlists={playlists} />
            <PlaylistSelect label="VAR Check" value={gameState.plVar} onChange={v => updateState('plVar', v)} playlists={playlists} />
          </div>

          <div className="mb-4">
            <PlaylistSelect label="Durchsage" value={gameState.plAnnouncement} onChange={v => updateState('plAnnouncement', v)} playlists={playlists} />
          </div>

          {/* PRESET MANAGEMENT */}
          <div className="mb-4">
            <label className="form-label text-muted small ms-1 mb-1">Preset</label>
            <div className="d-flex gap-1">
              <select className="form-select form-select-sm" value={currentPresetId} onChange={(e) => {
                if (e.target.value === 'new') {
                  setCurrentPresetId('new');
                  // Reset to defaults
                  setGameState(prev => ({
                    homeScore: 0, guestScore: 0,
                    matchState: 'PRE_GAME', timerStart: null, timerOffset: 0, timerRunning: false,
                    plWarmup: '', plCountdown: '', plScoreboard: '', plHalfTime: '', plEnd: '',
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
              <button className="btn btn-link" onClick={handleSaveClick}><BsFloppy /></button>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: LIVE CONTROL */}
        <div className="col-md-6 px-5 h-100" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          <h4 className="mb-5 text-center">Match</h4>

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
            <input
              type="text"
              className="form-control text-center fs-2 fw-bold font-monospace my-2"
              style={{ width: 160 }}
              value={timerString}
              onFocus={() => { isEditingTimerRef.current = true; }}
              onBlur={handleTimerBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
              onChange={(e) => setTimerString(e.target.value)}
            />

            <div className="text-center mt-3 mb-4">
              <button className="btn btn-primary px-5" onClick={commitScore}>Übernehmen</button>
            </div>
          </div>

          {/* PHASES */}

          <div className="mb-4">
            <h4 className="mb-3 text-center">1. Halbzeit</h4>
            <div className="row g-3">
              <div className="col-6">
                <button className="btn btn-outline-primary w-100" onClick={() => startMatchState('FIRST_HALF')}>
                  Anpfiff
                </button>
              </div>
              <div className="col-6">
                <button className="btn btn-outline-primary w-100" onClick={() => startMatchState('HALF_TIME')}>
                  Abpfiff
                </button>
              </div>
            </div>
          </div>

          <div className="mb-0">
            <h4 className="mb-3 text-center">2. Halbzeit</h4>
            <div className="row g-3">
              <div className="col-6">
                <button className="btn btn-outline-primary w-100" onClick={() => startMatchState('SECOND_HALF')}>
                  Anpfiff
                </button>
              </div>
              <div className="col-6">
                <button className="btn btn-outline-primary w-100" onClick={() => startMatchState('POST_GAME')}>
                  Abpfiff
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SCENES */}
        <div className="col-md-3 ps-4 psh-100" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="d-grid gap-2">

            <h5 className="mb-2 text-center">Vor dem Spiel</h5>
            <button className="btn btn-outline-primary" onClick={() => {
              const pl = playlists.find(p => p.id === gameState.plWarmup);
              if (pl) window.electronAPI.sendControlCommand('PLAY_PLAYLIST', { playlist: pl, mode: 'FULL' });
            }}>
              Warmup
            </button>
            <button className="btn btn-outline-primary mb-3" onClick={() => triggerScene(gameState.plCountdown)}>Countdown</button>

            <h5 className="mb-2 text-center">Im Spiel</h5>
            <button className="btn btn-outline-primary" onClick={() => {
              triggerScene(gameState.plGoalHome);
              setGameState(prev => ({ ...prev, homeScore: prev.homeScore + 1 }));
            }}>Tor Heim</button>
            <button className="btn btn-outline-primary" onClick={() => {
              triggerScene(gameState.plGoalGuest);
              setGameState(prev => ({ ...prev, guestScore: prev.guestScore + 1 }));
            }}>Tor Gast</button>
            <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plSub)}>Wechsel</button>
            <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plYellow)}>Gelbe Karte</button>
            <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plRed)}>Rote Karte</button>
            <button className="btn btn-outline-primary mb-4" onClick={() => triggerScene(gameState.plVar)}>VAR Check</button>

            <h5 className="mb-2 text-center">Allgemein</h5>
            <button className="btn btn-outline-primary" onClick={() => {
              // 1. Show standard scoreboard
              window.electronAPI.sendControlCommand('SHOW_SCOREBOARD');
              // 2. Restart background playlist if available, to be safe
              const pl = playlists.find(p => p.id === gameState.plScoreboard);
              if (pl) {
                window.electronAPI.sendControlCommand('PLAY_PLAYLIST', {
                  playlist: pl,
                  mode: 'BACKGROUND'
                });
              }
            }}>
              Spielstand
            </button>
            <button className="btn btn-outline-primary" onClick={() => {
              setAnnouncementText('');
              setShowAnnouncementModal(true);
            }}>Durchsage</button>
            <button className="btn btn-outline-danger" onClick={() => { window.electronAPI.sendControlCommand('STOP_OUTPUT', {}); }}>
              Ausgabe anhalten
            </button>
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

      {/* ANNOUNCEMENT MODAL */}
      {showAnnouncementModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Durchsage machen</h5>
                <button type="button" className="btn-close" onClick={() => setShowAnnouncementModal(false)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Nachricht</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={announcementText}
                  onChange={e => setAnnouncementText(e.target.value)}
                  autoFocus
                ></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAnnouncementModal(false)}>Abbrechen</button>
                <button type="button" className="btn btn-primary" onClick={handleAnnouncement}>Senden</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ControllerView;

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import OutputView from './OutputView';
import { BsFloppy } from "react-icons/bs";

// Helper Component defined outside to prevent re-mounting on parent re-renders
const PlaylistSelect = ({ label, value, onChange, playlists, showStandard = false }) => (
  <div className="mb-2">
    <label className="form-label text-muted small ms-1 mb-1">{label}</label>
    <select
      className="form-select form-select-sm"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">- Ignorieren -</option>
      {showStandard && <option value="STANDARD">- Standard -</option>}
      {playlists.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
    </select>
  </div>
);

function ControllerView() {
  useEffect(() => {
    document.title = 'Controller - Scoreboard';
  }, []);

  const [playlists, setPlaylists] = useState([]);

  const [presets, setPresets] = useState([]);
  const [currentPresetId, setCurrentPresetId] = useState('new');

  // Team logos (stored in preset)
  const [logoHomeId, setLogoHomeId] = useState('');
  const [logoGuestId, setLogoGuestId] = useState('');
  const [mediaImages, setMediaImages] = useState([]); // image-only list for logo picker
  const [showLogoModal, setShowLogoModal] = useState(null); // 'home' | 'guest' | null

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
    plLineup: '',
    plHalfTime: '',
    plEnd: '',
    plGoalHome: '',
    plGoalGuest: '',
    plSub: '',
    plYellow: '',
    plRed: '',
    plVar: '',
    plSpecial: '',
    plCorner: '',
    plOvertime: '',
    plAnnouncement: ''
  });

  // Local Score State (for editing before "Übernehmen")
  const [localScore, setLocalScore] = useState({ home: 0, guest: 0 });

  // Sync local score when preset loaded or external update
  // Sync local score when preset loaded or external update
  useEffect(() => {
    setLocalScore({ home: gameState.homeScore, guest: gameState.guestScore });
  }, [gameState.homeScore, gameState.guestScore]);

  // Visibility Settings
  const [visibility, setVisibility] = useState({
    warmup: true, lineup: true, halftime: true, end: true,
    goalHome: true, goalGuest: true, sub: true, yellow: true, red: true, var: true, special: true, corner: true, overtime: true, announcement: true
  });

  const confirmSave = async () => {
    if (!presetName) return;
    const id = window.crypto.randomUUID();
    await savePresetInternal(id, presetName);
    setShowSaveModal(false);
    toast.success("Preset gespeichert!");
    // After saving, load the newly saved preset
    const newPresets = await window.electronAPI.loadPresets();
    setPresets(newPresets);
    const newPreset = newPresets.find(p => p.id === id);
    if (newPreset) {
      loadPreset(newPreset);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const pl = await window.electronAPI.loadPlaylists();
      setPlaylists(pl);

      // Load images for logo picker
      const allMedia = await window.electronAPI.loadMedia();
      setMediaImages(allMedia.filter(m => m.type === 'image'));

      // Load or Create Default Preset
      let pr = await window.electronAPI.loadPresets();

      let defaultPreset = pr.find(p => p.name === 'Standard');

      if (!defaultPreset) {
        defaultPreset = {
          id: 'default',
          name: 'Standard',
          plWarmup: '', plLineup: '', plHalfTime: '', plEnd: '',
          plGoalHome: '', plGoalGuest: '', plSub: '', plYellow: '', plRed: '', plVar: '', plSpecial: '', plCorner: '', plOvertime: '', plAnnouncement: '',
          logoHomeId: '', logoGuestId: ''
        };
        await window.electronAPI.savePreset(defaultPreset);
        pr.push(defaultPreset);
      }

      setPresets(pr);

      if (defaultPreset) {
        loadPreset(defaultPreset);
      } else if (pr.length > 0) {
        loadPreset(pr[0]);
      }
    };
    loadData();
  }, []);

  const loadPreset = (preset) => {
    setCurrentPresetId(preset.id);

    setGameState(prev => ({
      ...prev,
      plWarmup: preset.plWarmup || '',
      plLineup: preset.plLineup || '',
      plHalfTime: preset.plHalfTime || '',
      plEnd: preset.plEnd || '',
      plGoalHome: preset.plGoalHome || '',
      plGoalGuest: preset.plGoalGuest || '',
      plSub: preset.plSub || '',
      plYellow: preset.plYellow || '',
      plRed: preset.plRed || '',
      plVar: preset.plVar || '',
      plSpecial: preset.plSpecial || '',
      plCorner: preset.plCorner || '',
      plOvertime: preset.plOvertime || '',
      plAnnouncement: preset.plAnnouncement || '',
    }));

    // Restore logos and send to output
    const homeId = preset.logoHomeId || '';
    const guestId = preset.logoGuestId || '';
    setLogoHomeId(homeId);
    setLogoGuestId(guestId);
    window.electronAPI.sendControlCommand('SET_TEAM_LOGOS', { homeId, guestId });
  };

  // Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState("");

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementDuration, setAnnouncementDuration] = useState("");

  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [subIn, setSubIn] = useState("");
  const [subOut, setSubOut] = useState("");
  const [subDuration, setSubDuration] = useState("10"); // Default 10s?

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardType, setCardType] = useState('yellow'); // 'yellow' or 'red'
  const [cardPlayerNr, setCardPlayerNr] = useState("");
  const [cardDuration, setCardDuration] = useState("10");

  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeInput, setOvertimeInput] = useState("");

  const handleOvertime = () => {
    const val = parseInt(overtimeInput, 10);
    if (!isNaN(val)) {
      setGameState(prev => ({
        ...prev,
        overtime: val
      }));
      // Only trigger a scene if a playlist is explicitly configured
      if (gameState.plOvertime) {
        triggerScene(gameState.plOvertime, 'Nachspielzeit');
      }
    }
    setShowOvertimeModal(false);
  };

  const handlePresetChange = (value) => {
    if (value === 'new') {
      setPresetName("");
      setShowSaveModal(true);
    } else {
      const p = presets.find(pr => pr.id === value);
      if (p) loadPreset(p);
    }
  };

  /* REMOVED handleSaveClick usage from UI, but kept logic for internal saves */

  const deleteCurrentPreset = async () => {
    if (currentPresetId === 'new') return;

    // Check if it is the Default preset (by name or ID if we knew it, here checking name safely)
    const current = presets.find(p => p.id === currentPresetId);
    if (current && (current.name === 'Standard' || current.id === 'default')) {
      toast.error("Das Standard-Preset kann nicht gelöscht werden.");
      return;
    }

    if (!window.confirm(`Preset "${current?.name}" wirklich löschen?`)) return;

    // Send delete command to backend (assuming we have one, or we just filter and save list?)
    // Checking electronAPI... usually we might need a deletePreset method.
    // If not available, we have to save the list without this item?
    // Looking at file content, there is no `deletePreset` in the visible `window.electronAPI` usage.
    // Wait, I should check if `deletePreset` exists. 
    // In step 288 (main.js view), I see `ipcMain.handle('save-preset', ...)` but NO `delete-preset`.
    // Wait, I see `load-presets`.
    // I can implement `delete-preset` in main.js, OR I can just simulate it?
    // Actually, looking at main.js again...
    // 365: ipcMain.handle('save-preset', ...)
    // 361: ipcMain.handle('load-presets', ...)
    // It seems there is NO `delete-preset` handler in main.js. 
    // I must add it to main.js first? Or can I assume `savePreset` with deleted flag?
    // main.js line 362: return loadPresetsList().filter(p => !p.deleted);
    // So if I save it with `deleted: true`, it should work!

    try {
      if (window.electronAPI.deletePreset) {
        await window.electronAPI.deletePreset(currentPresetId);
      } else {
        // Fallback if preload not updated yet (though I should update it)
        await window.electronAPI.savePreset({ ...current, deleted: true });
      }

      const newPresets = presets.filter(p => p.id !== currentPresetId);
      setPresets(newPresets);

      // Switch to Default or first available
      const def = newPresets.find(p => p.name === 'Standard') || newPresets[0];
      if (def) loadPreset(def);
      else setCurrentPresetId('new'); // Fallback

      toast.success("Preset gelöscht");
    } catch (e) {
      console.error(e);
      toast.error("Fehler beim Löschen");
    }
  };

  const updateState = (field, value) => {
    setGameState(prev => {
      const newState = { ...prev, [field]: value };

      // Auto-Save if we have a valid preset selected (and it's not "new")
      if (currentPresetId !== 'new') {
        // Debounce or just save? For dropdowns it's fine to save immediately usually.
        // But we must be careful not to save 'score' changes if we used updateState for them.
        // Check if field is a playlist field
        if (field.startsWith('pl')) {
          savePresetInternal(currentPresetId, presets.find(p => p.id === currentPresetId)?.name, newState);
        }
      }
      return newState;
    });
  };

  // Adjusted savePresetInternal to accept optional stateOverride
  const savePresetInternal = async (id, name, stateOverride = null) => {
    const stateToUse = stateOverride || gameState;

    const newPreset = {
      id,
      name,
      plWarmup: stateToUse.plWarmup,
      plLineup: stateToUse.plLineup,
      plHalfTime: stateToUse.plHalfTime,
      plEnd: stateToUse.plEnd,
      plGoalHome: stateToUse.plGoalHome,
      plGoalGuest: stateToUse.plGoalGuest,
      plSub: stateToUse.plSub,
      plYellow: stateToUse.plYellow,
      plRed: stateToUse.plRed,
      plVar: stateToUse.plVar,
      plSpecial: stateToUse.plSpecial,
      plCorner: stateToUse.plCorner,
      plOvertime: stateToUse.plOvertime,
      plAnnouncement: stateToUse.plAnnouncement,
      logoHomeId,
      logoGuestId,
    };

    try {
      await window.electronAPI.savePreset(newPreset);

      // Update local list
      setPresets(prev => {
        const idx = prev.findIndex(p => p.id === id);
        if (idx !== -1) {
          const copy = [...prev];
          // preserve existing fields if needed, but here we just replace with what we saved (plus valid internal flags if any)
          copy[idx] = { ...copy[idx], ...newPreset };
          return copy;
        }
        return [...prev, newPreset];
      });

      if (!stateOverride) {
        setCurrentPresetId(id);
        toast.success(`Preset "${name}" gespeichert`);
        setShowSaveModal(false);
      }
    } catch (e) {
      console.error(e);
      if (!stateOverride) toast.error("Fehler beim Speichern");
    }
  };

  const commitScore = () => {
    updateState('homeScore', localScore.home);
    updateState('guestScore', localScore.guest);
    toast.info("Spielstand aktualisiert");
  };

  const handleStartTimer = () => {
    setGameState(prev => {
      if (prev.timerRunning) return prev;
      return {
        ...prev,
        timerRunning: true,
        timerStart: Date.now()
      };
    });
  };

  const handleStopTimer = () => {
    setGameState(prev => {
      if (!prev.timerRunning) return prev;
      const now = Date.now();
      const diffSec = prev.timerStart ? Math.floor((now - prev.timerStart) / 1000) : 0;
      return {
        ...prev,
        timerRunning: false,
        timerStart: null,
        timerOffset: prev.timerOffset + diffSec
      };
    });
  };

  // --- MATCH CONTROL LOGIC ---
  // --- MATCH CONTROL LOGIC ---
  const startMatchState = (state) => {
    const updates = { matchState: state };

    if (state === 'FIRST_HALF') {
      updates.timerRunning = true;
      updates.timerStart = Date.now();
      updates.timerOffset = 0;
      // Show static scoreboard (no playlist needed)
      window.electronAPI.sendControlCommand('SHOW_SCOREBOARD');
    } else if (state === 'HALF_TIME') {
      updates.timerRunning = false;
      updates.timerOffset = 45 * 60;
      updates.timerStart = null;
      if (gameState.plHalfTime) {
        const pl = playlists.find(p => p.id === gameState.plHalfTime);
        if (pl) window.electronAPI.sendControlCommand('PLAY_PLAYLIST', { playlist: pl, mode: 'FULL' });
      }
    } else if (state === 'SECOND_HALF') {
      updates.timerRunning = true;
      updates.timerStart = Date.now();
      updates.timerOffset = 45 * 60;
      // Show static scoreboard (no playlist needed)
      window.electronAPI.sendControlCommand('SHOW_SCOREBOARD');
    } else if (state === 'POST_GAME') {
      updates.timerRunning = false;
      if (gameState.plEnd) {
        const pl = playlists.find(p => p.id === gameState.plEnd);
        if (pl) window.electronAPI.sendControlCommand('PLAY_PLAYLIST', { playlist: pl, mode: 'FULL' });
      }
    }

    setGameState(prev => ({ ...prev, ...updates }));
  };

  const triggerScene = (plId, title) => {
    if (!plId) {
      toast.warn("Keine Playlist für diese Szene ausgewählt!");
      return;
    }

    if (plId === 'DEFAULT') {
      window.electronAPI.sendControlCommand('SHOW_SCENE', {
        type: 'DEFAULT',
        title: title || 'Szene'
      });
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
    let bgPl = null;
    if (gameState.plAnnouncement) {
      bgPl = playlists.find(p => p.id === gameState.plAnnouncement) || null;
    }

    const payload = {
      message: announcementText,
      duration: announcementDuration ? parseInt(announcementDuration, 10) : null,
      backgroundPlaylist: bgPl
    };
    console.log('[Controller] Sending Announcement:', payload);
    window.electronAPI.sendControlCommand('SHOW_ANNOUNCEMENT', payload);
    setShowAnnouncementModal(false);
  };

  const handleSubstitution = () => {
    const plId = gameState.plSub;

    // 1. Ignorieren
    if (!plId) {
      setShowSubstitutionModal(false);
      return;
    }

    // 2. Playlist Selected
    if (plId !== 'STANDARD') {
      const pl = playlists.find(p => p.id === plId);
      if (pl) {
        console.log('[Controller] Substitution -> Playing Scene:', pl.title);
        window.electronAPI.sendControlCommand('SHOW_SCENE', pl);
      }
      setShowSubstitutionModal(false);
      return;
    }

    // 3. Standard
    const payload = {
      inNr: subIn,
      outNr: subOut,
      duration: subDuration ? parseInt(subDuration, 10) : null,
      backgroundPlaylist: null
    };
    console.log('[Controller] Sending Substitution (Standard):', payload);
    window.electronAPI.sendControlCommand('SHOW_SUBSTITUTION', payload);
    setShowSubstitutionModal(false);
  };

  const handleCard = () => {
    const plId = cardType === 'red' ? gameState.plRed : gameState.plYellow;

    // 1. Ignorieren
    if (!plId) {
      setShowCardModal(false);
      return;
    }

    // 2. Playlist
    if (plId !== 'STANDARD') {
      const pl = playlists.find(p => p.id === plId);
      if (pl) {
        console.log(`[Controller] ${cardType} Card -> Playing Scene:`, pl.title);
        window.electronAPI.sendControlCommand('SHOW_SCENE', pl);
      }
      setShowCardModal(false);
      return;
    }

    // 3. Standard
    const payload = {
      type: cardType,
      playerNr: cardPlayerNr,
      duration: cardDuration ? parseInt(cardDuration, 10) : null,
      backgroundPlaylist: null
    };
    console.log(`[Controller] Sending ${cardType} Card (Standard):`, payload);
    window.electronAPI.sendControlCommand('SHOW_CARD', payload);
    setShowCardModal(false);
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

          <div className="mb-4">
            {visibility.warmup && <PlaylistSelect label="Warmup" value={gameState.plWarmup} onChange={v => updateState('plWarmup', v)} playlists={playlists} />}
            {visibility.lineup && <PlaylistSelect label="Aufstellung" value={gameState.plLineup} onChange={v => updateState('plLineup', v)} playlists={playlists} />}
            {visibility.halftime && <PlaylistSelect label="Halbzeit" value={gameState.plHalfTime} onChange={v => updateState('plHalfTime', v)} playlists={playlists} />}
            {visibility.end && <PlaylistSelect label="Abpfiff" value={gameState.plEnd} onChange={v => updateState('plEnd', v)} playlists={playlists} />}
          </div>

          <div className="mb-4">
            {visibility.goalHome && <PlaylistSelect label="Tor Heim" value={gameState.plGoalHome} onChange={v => updateState('plGoalHome', v)} playlists={playlists} />}
            {visibility.goalGuest && <PlaylistSelect label="Tor Gast" value={gameState.plGoalGuest} onChange={v => updateState('plGoalGuest', v)} playlists={playlists} />}
          </div>

          <div className="mb-4">
            {visibility.sub && <PlaylistSelect label="Wechsel" value={gameState.plSub} onChange={v => updateState('plSub', v)} playlists={playlists} showStandard={true} />}
            {visibility.yellow && <PlaylistSelect label="Gelbe Karte" value={gameState.plYellow} onChange={v => updateState('plYellow', v)} playlists={playlists} showStandard={true} />}
            {visibility.red && <PlaylistSelect label="Rote Karte" value={gameState.plRed} onChange={v => updateState('plRed', v)} playlists={playlists} showStandard={true} />}
            {visibility.var && <PlaylistSelect label="VAR Check" value={gameState.plVar} onChange={v => updateState('plVar', v)} playlists={playlists} />}
            {visibility.corner && <PlaylistSelect label="Eckstoß" value={gameState.plCorner} onChange={v => updateState('plCorner', v)} playlists={playlists} />}
          </div>

          <div className="mb-4">
            {visibility.special && <PlaylistSelect label="Special" value={gameState.plSpecial} onChange={v => updateState('plSpecial', v)} playlists={playlists} />}
            {visibility.overtime && <PlaylistSelect label="Nachspielzeit" value={gameState.plOvertime} onChange={v => updateState('plOvertime', v)} playlists={playlists} />}
            {visibility.announcement && <PlaylistSelect label="Durchsage" value={gameState.plAnnouncement} onChange={v => updateState('plAnnouncement', v)} playlists={playlists} />}
          </div>

          {/* PRESET MANAGEMENT */}
          <div className="mb-4">
            <label className="form-label text-muted small ms-1 mb-1">Preset</label>
            <div className="d-flex gap-1">
              <select className="form-select form-select-sm" value={currentPresetId} onChange={(e) => handlePresetChange(e.target.value)}>
                <option value="new">Neues Preset...</option>
                {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="mt-1 d-flex justify-content-between align-items-center">
              <button className="btn btn-sm btn-link text-muted p-0" style={{ fontSize: '0.85rem' }} onClick={() => {
                setGameState(prev => ({
                  ...prev,
                  plWarmup: '', plLineup: '', plHalfTime: '', plEnd: '',
                  plGoalHome: '', plGoalGuest: '', plSub: '', plYellow: '', plRed: '', plVar: '', plSpecial: '', plCorner: '', plOvertime: '', plAnnouncement: ''
                }));
                toast.info("Playlists zurückgesetzt");
              }}>
                Zurücksetzen
              </button>

              {currentPresetId !== 'new' && presets.find(p => p.id === currentPresetId)?.name !== 'Standard' && (
                <button className="btn btn-sm btn-link text-danger p-0" style={{ fontSize: '0.85rem' }} onClick={deleteCurrentPreset} title="Preset löschen">
                  Löschen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: LIVE CONTROL */}
        <div className="col-md-6 px-5 h-100" style={{ overflowY: 'auto', overflowX: 'hidden' }}>

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

            <div className="d-flex justify-content-center gap-2 mt-3 mb-4">
              <button className="btn btn-outline-success px-4" onClick={handleStartTimer}>Start</button>
              <button className="btn btn-outline-danger px-4" onClick={handleStopTimer}>Stopp</button>
              <button className="btn btn-outline-primary px-5" onClick={commitScore}>Übernehmen</button>
            </div>
          </div>

          <div style={{ width: '100%', overflow: 'hidden' }}>
            <OutputView preview={true} />
          </div>

          {/* TEAM LOGO PICKER */}
          <div className="d-flex gap-3 mt-3 justify-content-center">
            {['home', 'guest'].map(side => {
              const id = side === 'home' ? logoHomeId : logoGuestId;
              const label = side === 'home' ? 'Heim Logo' : 'Gast Logo';
              const img = mediaImages.find(m => m.id === id);
              return (
                <div key={side} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    className="border rounded d-flex flex-column align-items-center justify-content-center p-1"
                    style={{ minHeight: 64, cursor: 'pointer', fontSize: '0.8rem' }}
                    onClick={() => setShowLogoModal(side)}
                  >
                    {img ? (
                      <>
                        <img src={`file://${img.path}`} alt={img.fileName} style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }} />
                      </>
                    ) : (
                      <span className="text-muted">{label}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* RIGHT COLUMN: SCENES */}
        <div className="col-md-3 ps-4 h-100" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="d-grid gap-2">

            {visibility.warmup && (
              <button className="btn btn-outline-primary" onClick={() => {
                const plId = gameState.plWarmup;
                if (plId === 'DEFAULT') {
                  window.electronAPI.sendControlCommand('PLAY_PLAYLIST', { playlist: { type: 'DEFAULT', title: 'Warmup' }, mode: 'FULL' });
                } else {
                  const pl = playlists.find(p => p.id === plId);
                  if (pl) window.electronAPI.sendControlCommand('PLAY_PLAYLIST', { playlist: pl, mode: 'FULL' });
                }
              }}>
                Warmup
              </button>
            )}

            {visibility.lineup && (
              <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plLineup, 'Aufstellung')}>
                Aufstellung
              </button>
            )}

            <div className="d-grid gap-2 my-3">
              <button className="btn btn-outline-primary w-100" onClick={() => startMatchState('FIRST_HALF')}>
                Anpfiff 1. Halbzeit
              </button>
              <button className="btn btn-outline-primary w-100" onClick={() => startMatchState('HALF_TIME')}>
                Abpfiff 1. Halbzeit
              </button>
              <button className="btn btn-outline-primary w-100" onClick={() => startMatchState('SECOND_HALF')}>
                Anpfiff 2. Halbzeit
              </button>
              <button className="btn btn-outline-primary w-100" onClick={() => startMatchState('POST_GAME')}>
                Abpfiff 2. Halbzeit
              </button>
              {visibility.overtime && (
                <button className="btn btn-outline-primary" onClick={() => {
                  setOvertimeInput("");
                  setShowOvertimeModal(true);
                }}>
                  Nachspielzeit
                </button>
              )}
            </div>

            {visibility.goalHome && (
              <button className="btn btn-outline-primary" onClick={() => {
                triggerScene(gameState.plGoalHome, 'Tor Heim');
                setGameState(prev => ({ ...prev, homeScore: prev.homeScore + 1 }));
              }}>Tor Heim</button>
            )}

            {visibility.goalGuest && (
              <button className="btn btn-outline-primary" onClick={() => {
                triggerScene(gameState.plGoalGuest, 'Tor Gast');
                setGameState(prev => ({ ...prev, guestScore: prev.guestScore + 1 }));
              }}>Tor Gast</button>
            )}

            {visibility.sub && (
              <button className="btn btn-outline-primary" onClick={() => {
                if (!gameState.plSub) {
                  toast.warn("Keine Playlist für diese Szene ausgewählt!");
                  return;
                }
                setSubIn('');
                setSubOut('');
                setSubDuration('10');
                setShowSubstitutionModal(true);
              }}>Wechsel</button>
            )}

            {visibility.corner && (
              <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plCorner, 'Eckstoß')}>
                Eckstoß
              </button>
            )}

            {visibility.yellow && (
              <button className="btn btn-outline-primary" onClick={() => {
                if (!gameState.plYellow) {
                  toast.warn("Keine Playlist für diese Szene ausgewählt!");
                  return;
                }
                setCardType('yellow');
                setCardPlayerNr('');
                setCardDuration('10');
                setShowCardModal(true);
              }}>Gelbe Karte</button>
            )}

            {visibility.red && (
              <button className="btn btn-outline-primary" onClick={() => {
                if (!gameState.plRed) {
                  toast.warn("Keine Playlist für diese Szene ausgewählt!");
                  return;
                }
                setCardType('red');
                setCardPlayerNr('');
                setCardDuration('10');
                setShowCardModal(true);
              }}>Rote Karte</button>
            )}

            {visibility.var && (
              <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plVar, 'VAR Check')}>
                VAR Check
              </button>
            )}

            <div className="mb-3">
              {/* Spacer */}
            </div>

            <button className="btn btn-outline-primary" onClick={() => window.electronAPI.sendControlCommand('SHOW_SCOREBOARD')}>
              Spielstand
            </button>

            {visibility.announcement && (
              <button className="btn btn-outline-primary" onClick={() => {
                setAnnouncementText('');
                setAnnouncementDuration('');
                setShowAnnouncementModal(true);
              }}>Durchsage</button>
            )}

            {visibility.special && (
              <button className="btn btn-outline-primary" onClick={() => triggerScene(gameState.plSpecial, 'Special')}>
                Special
              </button>
            )}

            <button className="btn btn-outline-danger my-3" onClick={() => { window.electronAPI.sendControlCommand('STOP_OUTPUT', {}); }}>
              Ausgabe anhalten
            </button>

          </div>
        </div>

      </div>

      {/* LOGO PICKER MODAL */}
      {showLogoModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{showLogoModal === 'home' ? 'Heim Logo' : 'Gast Logo'} auswählen</h5>
                <button type="button" className="btn-close" onClick={() => setShowLogoModal(null)} />
              </div>
              <div className="modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-outline-secondary btn-sm text-start"
                    onClick={() => {
                      if (showLogoModal === 'home') setLogoHomeId('');
                      else setLogoGuestId('');
                      const homeId = showLogoModal === 'home' ? '' : logoHomeId;
                      const guestId = showLogoModal === 'guest' ? '' : logoGuestId;
                      window.electronAPI.sendControlCommand('SET_TEAM_LOGOS', { homeId, guestId });
                      setShowLogoModal(null);
                    }}
                  >
                    - Kein Logo -
                  </button>
                  {mediaImages.map(img => (
                    <button
                      key={img.id}
                      className="btn btn-outline-primary btn-sm text-start d-flex align-items-center gap-2"
                      onClick={() => {
                        const homeId = showLogoModal === 'home' ? img.id : logoHomeId;
                        const guestId = showLogoModal === 'guest' ? img.id : logoGuestId;
                        if (showLogoModal === 'home') setLogoHomeId(img.id);
                        else setLogoGuestId(img.id);
                        window.electronAPI.sendControlCommand('SET_TEAM_LOGOS', { homeId, guestId });
                        setShowLogoModal(null);
                      }}
                    >
                      <img src={`file://${img.path}`} alt={img.fileName} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                      {img.fileName}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowLogoModal(null)}>Abbrechen</button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* OVERTIME MODAL */}
      {showOvertimeModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Nachspielzeit eingeben</h5>
                <button type="button" className="btn-close" onClick={() => setShowOvertimeModal(false)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Minuten</label>
                <input
                  type="number"
                  className="form-control"
                  value={overtimeInput}
                  onChange={e => setOvertimeInput(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleOvertime(); }}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-danger me-auto" onClick={() => { setGameState(prev => ({ ...prev, overtime: 0 })); setShowOvertimeModal(false); }}>Zurücksetzen</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOvertimeModal(false)}>Abbrechen</button>
                <button type="button" className="btn btn-primary" onClick={handleOvertime}>Übernehmen</button>
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

                <label className="form-label mt-3">Dauer (Sekunden)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Leer für dauerhaft"
                  value={announcementDuration}
                  onChange={e => setAnnouncementDuration(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAnnouncementModal(false)}>Abbrechen</button>
                <button type="button" className="btn btn-primary" onClick={handleAnnouncement}>Übernehmen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBSTITUTION MODAL */}
      {showSubstitutionModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Wechsel anzeigen</h5>
                <button type="button" className="btn-close" onClick={() => setShowSubstitutionModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col">
                    <label className="form-label">Rein (Nummer)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={subIn}
                      onChange={e => setSubIn(e.target.value)}
                      autoFocus
                      placeholder="#"
                    />
                  </div>
                  <div className="col">
                    <label className="form-label">Raus (Nummer)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={subOut}
                      onChange={e => setSubOut(e.target.value)}
                      placeholder="#"
                    />
                  </div>
                </div>

                <label className="form-label mt-3">Dauer (Sekunden)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="20"
                  value={subDuration}
                  onChange={e => setSubDuration(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubstitutionModal(false)}>Abbrechen</button>
                <button type="button" className="btn btn-primary" onClick={handleSubstitution}>Übernehmen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARD MODAL */}
      {showCardModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{cardType === 'red' ? 'Rote Karte' : 'Gelbe Karte'} anzeigen</h5>
                <button type="button" className="btn-close" onClick={() => setShowCardModal(false)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Spieler (Nummer)</label>
                <input
                  type="text"
                  className="form-control"
                  value={cardPlayerNr}
                  onChange={e => setCardPlayerNr(e.target.value)}
                  autoFocus
                  placeholder="#"
                />

                <label className="form-label mt-3">Dauer (Sekunden)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="10"
                  value={cardDuration}
                  onChange={e => setCardDuration(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCardModal(false)}>Abbrechen</button>
                <button type="button" className="btn btn-primary" onClick={handleCard}>Übernehmen</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ControllerView;

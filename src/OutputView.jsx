import { useState, useEffect, useRef } from 'react';

function OutputView() {
    // -- CONTENT STATE --
    const [standardPlaylist, setStandardPlaylist] = useState(null); // The "Background" Loop (e.g. Kickoff Loop)
    const [scenePlaylist, setScenePlaylist] = useState(null);       // The "Interrupt" Loop (e.g. Goal)

    // Current Playback State
    const [currentPlaylist, setCurrentPlaylist] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeMedia, setActiveMedia] = useState(null);

    // -- GAME STATE --
    const [gameState, setGameState] = useState({
        homeScore: 0,
        guestScore: 0,
        matchState: 'PRE_GAME',
        timerStart: null,
        timerOffset: 0,
        timerRunning: false
    });

    const [timerDisplay, setTimerDisplay] = useState("00:00");
    const mediaTimeoutRef = useRef(null);
    const timerIntervalRef = useRef(null);

    // --- COMMAND LISTENER ---
    useEffect(() => {
        if (window.electronAPI.onControlCommand) {
            const remove = window.electronAPI.onControlCommand((event, { command, payload }) => {
                console.log("CMD:", command, payload);

                if (command === 'UPDATE_GAME_STATE') {
                    setGameState(prev => ({ ...prev, ...payload }));
                }

                if (command === 'PLAY_PLAYLIST') {
                    // Determine if this is setting the standard background or a full takeover
                    const { playlist, mode } = payload;
                    // mode: 'BACKGROUND' (Match Loop) or 'FULL' (Sponsors)

                    if (mode === 'BACKGROUND') {
                        setStandardPlaylist(playlist);
                        setScenePlaylist(null); // Clear any active scene
                        // Automatically switch to this new background
                        setCurrentPlaylist(playlist);
                        setCurrentIndex(0);
                    } else {
                        // Full takeover (e.g. Sponsors), basically treated as a permanent new loop until changed
                        setStandardPlaylist(playlist);
                        setScenePlaylist(null);
                        setCurrentPlaylist(playlist);
                        setCurrentIndex(0);
                    }
                }

                if (command === 'SHOW_SCENE') {
                    // Interrupt current playback with this playlist
                    // payload is the playlist object directly
                    setScenePlaylist(payload);
                    setCurrentPlaylist(payload);
                    setCurrentIndex(0);
                }
            });
            return () => remove();
        }
    }, []);

    // --- TIMER LOGIC ---
    useEffect(() => {
        if (gameState.timerRunning && gameState.timerStart) {
            timerIntervalRef.current = setInterval(() => {
                const now = Date.now();
                const diffSec = Math.floor((now - gameState.timerStart) / 1000);
                const totalSec = gameState.timerOffset + diffSec;

                const m = Math.floor(totalSec / 60);
                const s = totalSec % 60;
                setTimerDisplay(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }, 1000);
        } else {
            // Update static display once if paused
            const totalSec = gameState.timerOffset;
            const m = Math.floor(totalSec / 60);
            const s = totalSec % 60;
            setTimerDisplay(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }

        return () => clearInterval(timerIntervalRef.current);
    }, [gameState.timerRunning, gameState.timerStart, gameState.timerOffset]);


    // --- MEDIA PLAYBACK LOOP ---
    // Load media whenever playlist or index changes
    useEffect(() => {
        if (!currentPlaylist || !currentPlaylist.items || currentPlaylist.items.length === 0) {
            setActiveMedia(null);
            return;
        }

        const item = currentPlaylist.items[currentIndex];
        loadMediaDetails(item);

    }, [currentPlaylist, currentIndex]);

    const loadMediaDetails = async (item) => {
        if (!item) return;
        // Fetch full path/details. Naive cache could be improved.
        const allMedia = await window.electronAPI.loadMedia();
        const found = allMedia.find(m => m.id === item.id);
        if (found) {
            setActiveMedia({ ...found, duration: item.duration || 5 });
        }
    };

    // Handle Image Duration / Loop Logic
    useEffect(() => {
        if (activeMedia && activeMedia.type === 'image') {
            const duration = activeMedia.duration || 5;
            mediaTimeoutRef.current = setTimeout(() => {
                handleMediaEnd();
            }, duration * 1000);
            return () => clearTimeout(mediaTimeoutRef.current);
        }
    }, [activeMedia]);

    const handleMediaEnd = () => {
        if (!currentPlaylist) return;

        const nextIndex = currentIndex + 1;

        // Check if end of playlist
        if (nextIndex >= currentPlaylist.items.length) {
            // If this was a SCENE, go back to standard playlist
            if (scenePlaylist) {
                setScenePlaylist(null);
                // Resume standard
                if (standardPlaylist) {
                    setCurrentPlaylist(standardPlaylist);
                    setCurrentIndex(0);
                } else {
                    setActiveMedia(null); // No background defined
                }
            } else {
                // Standard Loop: just restart
                setCurrentIndex(0);
            }
        } else {
            // Next item
            setCurrentIndex(nextIndex);
        }
    };

    // --- RENDER ---
    // If a SCENE is playing (and it's not null), we hide the Overlay. 
    // Wait, if scenePlaylist is active, we hide overlay.
    const showOverlay = !scenePlaylist;

    return (
        <div style={{ backgroundColor: 'black', height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>

            {/* MEDIA LAYER */}
            <div style={{ width: '100%', height: '100%' }}>
                {activeMedia ? (
                    activeMedia.type === 'video' ? (
                        <video
                            key={activeMedia.id}
                            src={`file://${activeMedia.path}`}
                            autoPlay
                            muted={false}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onEnded={handleMediaEnd}
                        />
                    ) : (
                        <img
                            src={`file://${activeMedia.path}`}
                            alt="Content"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    )
                ) : (
                    // Black screen if nothing playing
                    <div style={{ width: '100%', height: '100%', background: 'black' }} />
                )}
            </div>

            {/* OVERLAY LAYER - ALWAYS PRESENT, conditionally 'visible' */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                pointerEvents: 'none', // Let video be clickable if needed (debug)
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end', // Score at bottom? vs Top.
                alignItems: 'center',
                paddingBottom: '5vh',
                opacity: showOverlay ? 1 : 0, // Fade out during Scenes
                transition: 'opacity 0.5s ease-in-out'
            }}>

                {/* Default Scoreboard Design */}
                <div style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.9))',
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    padding: '20px 60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(10px)'
                }}>
                    {/* Teams & Score */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', marginBottom: '10px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ color: '#aaa', fontSize: '1.2rem', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>Heim</h2>
                            <div style={{ fontSize: '5rem', fontWeight: 'bold', lineHeight: 1, color: 'white' }}>{gameState.homeScore}</div>
                        </div>

                        <div style={{ width: '2px', height: '60px', background: 'rgba(255,255,255,0.2)' }}></div>

                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ color: '#aaa', fontSize: '1.2rem', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>Gast</h2>
                            <div style={{ fontSize: '5rem', fontWeight: 'bold', lineHeight: 1, color: 'white' }}>{gameState.guestScore}</div>
                        </div>
                    </div>

                    {/* Timer & Period */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#ffd700', fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        <span>{timerDisplay}</span>
                        {gameState.matchState !== 'PRE_GAME' && gameState.matchState !== 'POST_GAME' && (
                            <span style={{ fontSize: '1rem', color: '#888', alignSelf: 'center', marginLeft: '10px' }}>
                                {gameState.matchState === 'FIRST_HALF' ? '1. HZ' :
                                    gameState.matchState === 'SECOND_HALF' ? '2. HZ' : 'HZ'}
                            </span>
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
}

export default OutputView;

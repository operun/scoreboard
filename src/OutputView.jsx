import { useState, useEffect, useRef } from 'react';

function OutputView() {
    // -- CONTENT STATE --
    const [standardPlaylist, setStandardPlaylist] = useState(null);
    const [standardMode, setStandardMode] = useState('BACKGROUND'); // 'BACKGROUND' or 'FULL'
    const [scenePlaylist, setScenePlaylist] = useState(null);

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
                    const { playlist, mode } = payload;
                    // Update standard playlist and mode
                    setStandardPlaylist(playlist);
                    setStandardMode(mode || 'BACKGROUND');

                    // If we receive a new standard playlist, we generally switch to it immediately
                    // Clearing any scene that might be running
                    setScenePlaylist(null);
                    setCurrentPlaylist(playlist);
                    setCurrentIndex(0);
                }

                if (command === 'SHOW_SCENE') {
                    setScenePlaylist(payload);
                    setCurrentPlaylist(payload);
                    setCurrentIndex(0);
                }
            });
            return () => remove();
        }
    }, []);

    // ... (Timer Logic Omitted, unchanged) ...

    // ... (Media Playback Logic Omitted, unchanged) ...

    // --- RENDER ---
    // Overlay is visible ONLY if:
    // 1. No Scene is active AND
    // 2. Standard Mode is NOT 'FULL' (because FULL means full screen video without overlay)
    const showOverlay = !scenePlaylist && standardMode !== 'FULL';

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
                    <div style={{ width: '100%', height: '100%', background: 'black' }} />
                )}
            </div>

            {/* OVERLAY LAYER - ALWAYS PRESENT, conditionally 'visible' */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center', // Centered vertically
                alignItems: 'center',     // Centered horizontally
                opacity: showOverlay ? 1 : 0,
                transition: 'opacity 0.5s ease-in-out'
            }}>

                {/* Default Scoreboard Design */}
                <div style={{
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    {/* Teams & Score */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        width: '100%',
                        alignItems: 'center',
                    }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <h2 style={{ color: '#fff', fontSize: '5vw', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Heim
                            </h2>
                            <div style={{ fontSize: '50vh', fontWeight: 'bold', lineHeight: 1, color: 'white' }}>
                                {gameState.homeScore}
                            </div>
                        </div>

                        <div style={{ color: '#fff', fontSize: '50vh' }}>:</div>

                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <h2 style={{ color: '#fff', fontSize: '5vw', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Gast
                            </h2>
                            <div style={{ fontSize: '50vh', fontWeight: 'bold', lineHeight: 1, color: 'white' }}>
                                {gameState.guestScore}
                            </div>
                        </div>
                    </div>

                    {/* Timer Only */}
                    <div style={{
                        color: '#fff',
                        fontSize: '10vh',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        letterSpacing: '0.1em'
                    }}>
                        {timerDisplay}
                    </div>
                </div>

            </div>

        </div>
    );
}

export default OutputView;

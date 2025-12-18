import { useState, useEffect, useRef } from 'react';
import testImage from '../assets/testbild.png';

function OutputView() {
    // -- CONTENT STATE --
    const [standardPlaylist, setStandardPlaylist] = useState(null);
    const [standardMode, setStandardMode] = useState('BACKGROUND'); // 'BACKGROUND' or 'FULL'
    const [scenePlaylist, setScenePlaylist] = useState(null);
    const [announcement, setAnnouncement] = useState(null);
    const [showScoreboard, setShowScoreboard] = useState(false);

    // Current Playback State
    const [currentPlaylist, setCurrentPlaylist] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeMedia, setActiveMedia] = useState(null);

    // -- OUTPUT SETTINGS --
    const [outputSize, setOutputSize] = useState({ width: 1280, height: 720 });
    const [showCropMarks, setShowCropMarks] = useState(true);

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

    // -- TEST IMAGE --
    const [currentTestImage, setCurrentTestImage] = useState(testImage);

    // --- LOAD SETTINGS & LISTEN FOR UPDATES ---
    useEffect(() => {
        const applySettings = (settings) => {
            if (settings) {
                const w = parseInt(settings.outputWidth) || 1280;
                const h = parseInt(settings.outputHeight) || 720;
                setOutputSize({ width: w, height: h });
                setShowCropMarks(settings.showCropMarks !== false); // Default true

                // If settings include a test image path (added in backend), use it
                if (settings.customTestImage) {
                    setCurrentTestImage(settings.customTestImage);
                }
            }
        };

        const loadSettings = async () => {
            const settings = await window.electronAPI.loadSettings();
            applySettings(settings);
        };
        loadSettings();

        // Listen for updates from SettingsView
        if (window.electronAPI.onSettingsUpdated) {
            const remove = window.electronAPI.onSettingsUpdated((event, settings) => {
                applySettings(settings);
            });
            return () => remove();
        }
    }, []);

    // Listen for test image updates (direct upload or delete)
    useEffect(() => {
        if (window.electronAPI.onTestImageUpdated) {
            const remove = window.electronAPI.onTestImageUpdated((event, path) => {
                if (path) {
                    setCurrentTestImage(path);
                } else {
                    setCurrentTestImage(testImage);
                }
            });
            return () => remove();
        }
    }, []);

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

                    // If mode is BACKGROUND, we assume we want to show the scoreboard
                    if ((mode || 'BACKGROUND') === 'BACKGROUND') {
                        setShowScoreboard(true);
                    }

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
                    setAnnouncement(null); // Clear announcement when switching scenes unless explicitly kept
                }

                if (command === 'SHOW_ANNOUNCEMENT') {
                    setAnnouncement(payload.message);
                }

                if (command === 'SHOW_SCOREBOARD') {
                    setScenePlaylist(null);
                    setAnnouncement(null);
                    // Always reset to standard playlist (even if null) to stop any running scene
                    setCurrentPlaylist(standardPlaylist);
                    setCurrentIndex(0);
                    setShowScoreboard(true);
                }

                if (command === 'STOP_OUTPUT') {
                    setScenePlaylist(null);
                    setStandardPlaylist(null);
                    setCurrentPlaylist(null);
                    setActiveMedia(null);
                    setStandardMode('BACKGROUND');
                    setAnnouncement(null);
                    setShowScoreboard(false);
                }
            });
            return () => remove();
        }
    }, [standardPlaylist]); // Dependency added to ensure we have latest standardPlaylist

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
            const totalSec = gameState.timerOffset;
            const m = Math.floor(totalSec / 60);
            const s = totalSec % 60;
            setTimerDisplay(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }

        return () => clearInterval(timerIntervalRef.current);
    }, [gameState.timerRunning, gameState.timerStart, gameState.timerOffset]);


    // --- MEDIA PLAYBACK LOOP ---
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
        const allMedia = await window.electronAPI.loadMedia();
        const found = allMedia.find(m => m.id === item.id);
        if (found) {
            setActiveMedia({ ...found, duration: item.duration || 5 });
        }
    };

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

        if (nextIndex >= currentPlaylist.items.length) {
            if (scenePlaylist) {
                // ERROR-CHECK: If we are in announcement mode, we loop the scene!
                if (announcement) {
                    setCurrentIndex(0);
                    return;
                }

                setScenePlaylist(null);
                if (standardPlaylist) {
                    setCurrentPlaylist(standardPlaylist);
                    setCurrentIndex(0);
                } else {
                    setActiveMedia(null);
                    setCurrentPlaylist(null);
                }
            } else {
                setCurrentIndex(0);
            }
        } else {
            setCurrentIndex(nextIndex);
        }
    };

    // --- RENDER ---
    // Overlay is visible ONLY if:
    // 1. showScoreboard is TRUE
    // 2. No Scene is active AND
    // 3. Standard Mode is NOT 'FULL'
    // Note: We allow overlay without activeMedia (showing over test image)
    const showOverlay = showScoreboard && !scenePlaylist && standardMode !== 'FULL';

    // Outer container: Centers the output view in the window (Letterboxing)
    return (
        <div style={{
            backgroundColor: '#111',
            height: '100vh',
            width: '100vw',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
        }}>
            {/* Inner Container: Fixed resolution based on settings */}
            <div style={{
                width: outputSize.width,
                height: outputSize.height,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: 'black',
                containerType: 'size', // Key for using cqw/cqh units
                border: '1px solid #333'
            }}>

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
                        <>
                            <img
                                src={currentTestImage}
                                alt="Testbild"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {/* Schnittmarken (Crop Marks) */}
                            {showCropMarks && (
                                <>
                                    {/* Top Left */}
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: '6px solid #f00', borderLeft: '6px solid #f00', zIndex: 100 }} />
                                    {/* Top Right */}
                                    <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: '6px solid #f00', borderRight: '6px solid #f00', zIndex: 100 }} />
                                    {/* Bottom Left */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: '6px solid #f00', borderLeft: '6px solid #f00', zIndex: 100 }} />
                                    {/* Bottom Right */}
                                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '6px solid #f00', borderRight: '6px solid #f00', zIndex: 100 }} />

                                    {/* Center Cross */}
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '40px', height: '2px', backgroundColor: '#f00', transform: 'translate(-50%, -50%)', zIndex: 100 }} />
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '2px', height: '40px', backgroundColor: '#f00', transform: 'translate(-50%, -50%)', zIndex: 100 }} />
                                </>
                            )}
                        </>
                    )}
                </div>

                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center', // Centered vertically
                    alignItems: 'center',     // Centered horizontally
                    opacity: (showOverlay || announcement) ? 1 : 0,
                    transition: 'opacity 0.5s ease-in-out'
                }}>

                    {announcement ? (
                        <div style={{
                            width: '80%',
                            padding: '40px',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            fontSize: '6cqw',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            borderRadius: '20px',
                            whiteSpace: 'pre-wrap',
                            letterSpacing: '0.1em',
                        }}>
                            {announcement}
                        </div>
                    ) : (
                        /* Default Scoreboard Design */
                        <div style={{
                            width: '40cqw', // Changed vw to cqw
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>

                            {/* Timer Only */}
                            <div style={{
                                color: '#fff',
                                fontSize: '5cqh', // Changed vh to cqh
                                fontWeight: 'bold',
                                fontFamily: 'monospace',
                                letterSpacing: '0.1em',
                                position: 'absolute',
                                bottom: '20px',
                                textAlign: 'center',
                                width: '100%'
                            }}>
                                {timerDisplay}
                            </div>

                            {/* Teams & Score */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-around',
                                width: '100%',
                                alignItems: 'center',
                                marginBottom: '15cqh' // Changed vh to cqh
                            }}>
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <h1 style={{ color: '#fff', fontSize: '5cqw', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5cqh' }}>
                                        Heim
                                    </h1>
                                    <div style={{ fontSize: '30cqh', fontWeight: 'bold', lineHeight: 1, color: 'white' }}>
                                        {gameState.homeScore}
                                    </div>
                                </div>

                                <div style={{ color: '#fff', fontSize: '20cqh', marginTop: '10cqh' }}>:</div>

                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <h1 style={{ color: '#fff', fontSize: '5cqw', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5cqh' }}>
                                        Gast
                                    </h1>
                                    <div style={{ fontSize: '30cqh', fontWeight: 'bold', lineHeight: 1, color: 'white' }}>
                                        {gameState.guestScore}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}

export default OutputView;

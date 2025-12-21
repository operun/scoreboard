import { useState, useEffect, useRef } from 'react';
import testImage from './assets/testbild.png';
import PlaylistScene from './components/output/PlaylistScene';
import ScoreboardScene from './components/output/ScoreboardScene';
import AnnouncementScene from './components/output/AnnouncementScene';
import SubstitutionScene from './components/output/SubstitutionScene';
import CardScene from './components/output/CardScene';

function OutputView({ preview = false }) {
    useEffect(() => {
        if (!preview) document.title = 'Output - Scoreboard';
    }, [preview]);

    // -- CONTENT STATE --
    const [standardPlaylist, setStandardPlaylist] = useState(null);
    const [standardMode, setStandardMode] = useState('BACKGROUND'); // 'BACKGROUND' or 'FULL'
    const [scenePlaylist, setScenePlaylist] = useState(null);
    const [announcement, setAnnouncement] = useState(null);
    const [announcementDuration, setAnnouncementDuration] = useState(null);
    const [substitution, setSubstitution] = useState(null);
    const [card, setCard] = useState(null);
    const [savedScene, setSavedScene] = useState(null); // Snapshot of scenePlaylist to restore
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
        timerOffset: 0,
        timerRunning: false,
        overtime: 0
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

        // If PREVIEW, request sync from the main output
        if (preview) {
            window.electronAPI.sendControlCommand('REQUEST_SYNC', {});
        }

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
                    setScenePlaylist(null);
                    setCurrentPlaylist(playlist);
                    setCurrentIndex(0);
                    // Standard playlist change might clear announcement? Let's assume standard behavior:
                    // Only SHOW_SCENE / SHOW_ANNOUNCEMENT explicitly change announcement state logic.
                    // But if we start a new playlist, maybe we want to keep announcement if it's overlay?
                    // For now, let's keep it simple: playlist change does NOT auto-hide announcement
                }

                if (command === 'SHOW_SCENE') {
                    setScenePlaylist(payload);
                    setCurrentPlaylist(payload);
                    setCurrentIndex(0);
                    setAnnouncement(null); // Clear announcement when switching scenes
                    setAnnouncementDuration(null);
                    setSubstitution(null);
                    setCard(null);
                    setSavedScene(null); // Explicit scene change clears restore path
                }

                if (command === 'SHOW_ANNOUNCEMENT') {
                    console.log('CMD: SHOW_ANNOUNCEMENT', payload);
                    setAnnouncement(payload.message);
                    const d = parseInt(payload.duration, 10);
                    setAnnouncementDuration((!isNaN(d) && d > 0) ? d : null);

                    if (payload.backgroundPlaylist) {
                        // Save current scene if not already saved (to handle updates to text without losing origin)
                        setSavedScene(prev => prev !== null ? prev : { playlist: scenePlaylist });
                        setScenePlaylist(payload.backgroundPlaylist);
                        setCurrentPlaylist(payload.backgroundPlaylist);
                        setCurrentIndex(0);
                    }
                }

                if (command === 'SHOW_SUBSTITUTION') {
                    console.log('CMD: SHOW_SUBSTITUTION', payload);
                    const d = parseInt(payload.duration, 10);
                    setSubstitution({
                        inNr: payload.inNr,
                        outNr: payload.outNr,
                        duration: (!isNaN(d) && d > 0) ? d : null
                    });

                    // Clear announcement
                    setAnnouncement(null);
                    setAnnouncementDuration(null);
                    setCard(null); // Clear card

                    if (payload.backgroundPlaylist) {
                        setSavedScene(prev => prev !== null ? prev : { playlist: scenePlaylist });
                        setScenePlaylist(payload.backgroundPlaylist);
                        setCurrentPlaylist(payload.backgroundPlaylist);
                        setCurrentIndex(0);
                    }
                }

                if (command === 'SHOW_CARD') {
                    console.log('CMD: SHOW_CARD', payload);
                    const d = parseInt(payload.duration, 10);
                    setCard({
                        type: payload.type,
                        playerNr: payload.playerNr,
                        duration: (!isNaN(d) && d > 0) ? d : null
                    });

                    // Clear others
                    setAnnouncement(null);
                    setAnnouncementDuration(null);
                    setSubstitution(null);

                    if (payload.backgroundPlaylist) {
                        setSavedScene(prev => prev !== null ? prev : { playlist: scenePlaylist });
                        setScenePlaylist(payload.backgroundPlaylist);
                        setCurrentPlaylist(payload.backgroundPlaylist);
                        setCurrentIndex(0);
                    }
                }

                if (command === 'SHOW_SCOREBOARD') {
                    setScenePlaylist(null);
                    setAnnouncement(null);
                    setAnnouncementDuration(null);
                    setSubstitution(null);
                    setCard(null);
                    setSavedScene(null);
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
                    setActiveMedia(null);
                    setStandardMode('BACKGROUND');
                    setAnnouncement(null);
                    setAnnouncementDuration(null);
                    setSubstitution(null);
                    setCard(null);
                    setSavedScene(null);
                    setShowScoreboard(false);
                }

                // --- SYNC MECHANISM ---
                if (command === 'REQUEST_SYNC' && !preview) {
                    // MAIN OUTPUT: Respond with current state
                    window.electronAPI.sendControlCommand('SYNC_STATUS', {
                        standardPlaylist,
                        standardMode,
                        scenePlaylist,
                        announcement,
                        announcementDuration,
                        showScoreboard,
                        currentPlaylist,
                        // For currentIndex, we send the current one.
                        // Ideally we might want to sync start timestamps to overlap video perfectly,
                        // but simple index sync is often "good enough" for preview.
                        currentIndex,
                        gameState
                    });
                }

                if (command === 'SYNC_STATUS' && preview) {
                    // PREVIEW: Adopt the state
                    const s = payload;
                    setStandardPlaylist(s.standardPlaylist);
                    setStandardMode(s.standardMode);
                    setScenePlaylist(s.scenePlaylist);
                    setAnnouncement(s.announcement);
                    setAnnouncementDuration(s.announcementDuration);
                    setShowScoreboard(s.showScoreboard);
                    setCurrentPlaylist(s.currentPlaylist);
                    setCurrentIndex(s.currentIndex);
                    setGameState(s.gameState);
                }
            });
            return () => remove();
        }
    }, [standardPlaylist]); // Dependency added to ensure we have latest standardPlaylist

    // --- ANNOUNCEMENT TIMEOUT ---
    // If an announcement is set WITH a duration, clear it after that time
    useEffect(() => {
        if (announcement && announcementDuration) {
            console.log(`[OutputView] Timer started for ${announcementDuration}s`);
            const timer = setTimeout(() => {
                console.log('[OutputView] Timer finished. Clearing.');
                setAnnouncement(null);
                setAnnouncementDuration(null);

                // Restore previous scene logic
                if (savedScene) {
                    console.log('[OutputView] Restoring saved scene:', savedScene);
                    setScenePlaylist(savedScene.playlist);
                    setCurrentPlaylist(savedScene.playlist || standardPlaylist);
                    setCurrentIndex(0);
                    setSavedScene(null);
                }

            }, announcementDuration * 1000);
            return () => clearTimeout(timer);
        }
    }, [announcement, announcementDuration, savedScene, standardPlaylist]);

    // --- SUBSTITUTION TIMEOUT ---
    useEffect(() => {
        if (substitution && substitution.duration) {
            console.log(`[OutputView] Sub Timer started for ${substitution.duration}s`);
            const timer = setTimeout(() => {
                console.log('[OutputView] Sub Timer finished. Clearing.');
                setSubstitution(null);

                // Restore previous scene logic
                if (savedScene) {
                    console.log('[OutputView] Restoring saved scene:', savedScene);
                    setScenePlaylist(savedScene.playlist);
                    setCurrentPlaylist(savedScene.playlist || standardPlaylist);
                    setCurrentIndex(0);
                    setSavedScene(null);
                }

            }, substitution.duration * 1000);
            return () => clearTimeout(timer);
        }
    }, [substitution, savedScene, standardPlaylist]);

    // --- CARD TIMEOUT ---
    useEffect(() => {
        if (card && card.duration) {
            console.log(`[OutputView] Card Timer started for ${card.duration}s`);
            const timer = setTimeout(() => {
                console.log('[OutputView] Card Timer finished. Clearing.');
                setCard(null);

                // Restore previous scene logic (shared)
                if (savedScene) {
                    console.log('[OutputView] Restoring saved scene:', savedScene);
                    setScenePlaylist(savedScene.playlist);
                    setCurrentPlaylist(savedScene.playlist || standardPlaylist);
                    setCurrentIndex(0);
                    setSavedScene(null);
                }

            }, card.duration * 1000);
            return () => clearTimeout(timer);
        }
    }, [card, savedScene, standardPlaylist]);

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
            backgroundColor: preview ? 'transparent' : '#111',
            height: preview ? '100%' : '100vh',
            width: preview ? '100%' : '100vw',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
        }}>
            {/* Inner Container: Fixed resolution based on settings */}
            <div style={{
                width: preview ? '100%' : outputSize.width,
                height: preview ? '100%' : outputSize.height,
                aspectRatio: preview ? `${outputSize.width} / ${outputSize.height}` : undefined,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: 'black',
                containerType: 'size', // Key for using cqw/cqh units
                border: '1px solid #333'
            }}>

                {/* MEDIA LAYER */}
                <div style={{ width: '100%', height: '100%' }}>
                    <PlaylistScene
                        activeMedia={activeMedia}
                        currentTestImage={currentTestImage}
                        showCropMarks={showCropMarks}
                        onMediaEnd={handleMediaEnd}
                        preview={preview}
                    />
                </div>

                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center', // Centered vertically
                    alignItems: 'center',     // Centered horizontally
                    opacity: (showOverlay || announcement || substitution || card) ? 1 : 0,
                }}>

                    {card ? (
                        <CardScene type={card.type} playerNr={card.playerNr} />
                    ) : substitution ? (
                        <SubstitutionScene inNr={substitution.inNr} outNr={substitution.outNr} />
                    ) : announcement ? (
                        <AnnouncementScene message={announcement} />
                    ) : (
                        /* Default Scoreboard Design */
                        <ScoreboardScene gameState={gameState} timerDisplay={timerDisplay} />
                    )}

                </div>

            </div>
        </div>
    );
}

export default OutputView;

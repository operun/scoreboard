import { useState, useEffect, useRef } from 'react';
import testImage from './assets/testbild.png';
import PlaylistScene from './components/output/PlaylistScene';
import ScoreboardScene from './components/output/ScoreboardScene';
import AnnouncementScene from './components/output/AnnouncementScene';
import SubstitutionScene from './components/output/SubstitutionScene';
import CardScene from './components/output/CardScene';
import CountdownScene from './components/output/CountdownScene';

function OutputView({ preview = false }) {
    // 'preview' = controller-embedded preview, 'output' = real output window.
    // Used to address sync requests/responses between the two instances.
    const role = preview ? 'preview' : 'output';

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
    const [playToken, setPlayToken] = useState(0);
    const [resolved, setResolved] = useState(null);
    const [activeMedia, setActiveMedia] = useState(null);

    // -- OUTPUT SETTINGS --
    const [outputSize, setOutputSize] = useState({ width: 1280, height: 720 });
    const [showCropMarks, setShowCropMarks] = useState(true);
    const [countdownFullscreen, setCountdownFullscreen] = useState(true);

    // -- FIT-TO-WINDOW SCALING (non-preview only) --
    // The inner container stays at the fixed outputSize (px) so the scenes'
    // cqw/cqh units keep a stable reference; we scale it uniformly to fill the
    // available window/screen while preserving the aspect ratio.
    const outerRef = useRef(null);
    const [scale, setScale] = useState(1);
    useEffect(() => {
        if (preview) return;
        const el = outerRef.current;
        if (!el) return;
        const update = () => {
            const { width, height } = el.getBoundingClientRect();
            if (!width || !height) return;
            setScale(Math.min(width / outputSize.width, height / outputSize.height));
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [preview, outputSize.width, outputSize.height]);

    // -- SCOREBOARD ASSETS --
    const [homeLogoPath, setHomeLogoPath] = useState(null);
    const [guestLogoPath, setGuestLogoPath] = useState(null);
    const [scoreboardBgPath, setScoreboardBgPath] = useState(null);
    const [scoreboardSponsorPath, setScoreboardSponsorPath] = useState(null);

    // -- GAME STATE --
    const [gameState, setGameState] = useState({
        homeScore: 0,
        guestScore: 0,
        matchState: 'PRE_GAME',
        timerStart: null,
        timerOffset: 0,
        timerRunning: false,
        overtime: 0,
        countdownActive: false,
        kickoffAt: null
    });

    const [timerDisplay, setTimerDisplay] = useState("00:00");
    const [countdownDisplay, setCountdownDisplay] = useState("00:00");
    const playbackCounterRef = useRef(0);
    const timerIntervalRef = useRef(null);

    // -- TEST IMAGE --
    const [currentTestImage, setCurrentTestImage] = useState(testImage);

    // --- LOAD SETTINGS & LISTEN FOR UPDATES ---
    useEffect(() => {
        const resolveMediaId = async (id, allMedia) => {
            if (!id) return null;
            const found = allMedia.find(m => m.id === id);
            return found ? found.path : null;
        };

        const applySettings = async (settings) => {
            if (settings) {
                const w = parseInt(settings.outputWidth) || 1280;
                const h = parseInt(settings.outputHeight) || 720;
                setOutputSize({ width: w, height: h });
                setShowCropMarks(settings.showCropMarks !== false);
                setCountdownFullscreen(settings.countdownFullscreen !== false);

                if (settings.customTestImage) {
                    setCurrentTestImage(settings.customTestImage);
                }

                // Resolve scoreboard bg + sponsor from media IDs
                if (settings.scoreboardBgId || settings.scoreboardSponsorId) {
                    const allMedia = await window.electronAPI.loadMedia();
                    setScoreboardBgPath(await resolveMediaId(settings.scoreboardBgId, allMedia));
                    setScoreboardSponsorPath(await resolveMediaId(settings.scoreboardSponsorId, allMedia));
                } else {
                    if (!settings.scoreboardBgId) setScoreboardBgPath(null);
                    if (!settings.scoreboardSponsorId) setScoreboardSponsorPath(null);
                }
            }
        };

        const loadSettings = async () => {
            const settings = await window.electronAPI.loadSettings();
            applySettings(settings);
        };
        loadSettings();

        // Pull current state from the counterpart: the preview asks the
        // output window, a (re)opened output window asks the preview.
        window.electronAPI.sendControlCommand('REQUEST_SYNC', { from: role });

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

    // Latest-ref so the (once-bound) command listener never reads stale state
    // (it is registered once, but must answer REQUEST_SYNC with live values).
    const liveStateRef = useRef(null);
    liveStateRef.current = {
        standardPlaylist,
        standardMode,
        scenePlaylist,
        announcement,
        announcementDuration,
        showScoreboard,
        currentPlaylist,
        currentIndex,
        gameState,
        homeLogoPath,
        guestLogoPath,
        scoreboardBgPath,
        scoreboardSponsorPath,
    };
    const resolvedRef = useRef(null);
    resolvedRef.current = resolved;
    const activeMediaRef = useRef(null);
    activeMediaRef.current = activeMedia;

    // --- COMMAND LISTENER ---
    useEffect(() => {
        if (window.electronAPI.onControlCommand) {
            const remove = window.electronAPI.onControlCommand(async (event, { command, payload }) => {
                console.log("CMD:", command, payload);

                if (command === 'UPDATE_GAME_STATE') {
                    setGameState(prev => ({ ...prev, ...payload }));
                }

                if (command === 'SET_TEAM_LOGOS') {
                    const { homeId, guestId } = payload;
                    const allMedia = await window.electronAPI.loadMedia();
                    const resolve = (id) => {
                        if (!id) return null;
                        const found = allMedia.find(m => m.id === id);
                        return found ? found.path : null;
                    };
                    setHomeLogoPath(resolve(homeId));
                    setGuestLogoPath(resolve(guestId));
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
                        setSavedScene(prev => prev !== null ? prev : { playlist: liveStateRef.current.scenePlaylist });
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
                        setSavedScene(prev => prev !== null ? prev : { playlist: liveStateRef.current.scenePlaylist });
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
                        setSavedScene(prev => prev !== null ? prev : { playlist: liveStateRef.current.scenePlaylist });
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
                    setStandardMode('BACKGROUND'); // ensure overlay condition is met
                    setCurrentPlaylist(liveStateRef.current.standardPlaylist);
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
                    setAnnouncementDuration(null);
                    setSubstitution(null);
                    setCard(null);
                    setSavedScene(null);
                    setShowScoreboard(false);
                }

                // --- SYNC MECHANISM ---
                if (command === 'REQUEST_SYNC' && payload?.from && payload.from !== role) {
                    // The counterpart instance asked for state: respond with a live snapshot
                    window.electronAPI.sendControlCommand('SYNC_STATUS', {
                        ...liveStateRef.current,
                        to: payload.from,
                    });
                }

                if (command === 'SYNC_STATUS' && payload?.to === role) {
                    // Adopt the counterpart's state
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
                    if (s.homeLogoPath !== undefined) setHomeLogoPath(s.homeLogoPath);
                    if (s.guestLogoPath !== undefined) setGuestLogoPath(s.guestLogoPath);
                    if (s.scoreboardBgPath !== undefined) setScoreboardBgPath(s.scoreboardBgPath);
                    if (s.scoreboardSponsorPath !== undefined) setScoreboardSponsorPath(s.scoreboardSponsorPath);
                }
            });
            return () => remove();
        }
    }, []); // register once; live values are read via liveStateRef

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

    // --- COUNTDOWN LOGIC ---
    useEffect(() => {
        if (!gameState.countdownActive || !gameState.kickoffAt) return;

        const update = () => {
            const rest = Math.max(0, Math.ceil((gameState.kickoffAt - Date.now()) / 1000));
            const h = Math.floor(rest / 3600);
            const m = Math.floor((rest % 3600) / 60);
            const s = rest % 60;
            const mm = m.toString().padStart(2, '0');
            const ss = s.toString().padStart(2, '0');
            setCountdownDisplay(h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`);
        };
        update();

        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [gameState.countdownActive, gameState.kickoffAt]);


    // --- MEDIA PLAYBACK LOOP ---
    const endScene = () => {
        setScenePlaylist(null);
        setCurrentPlaylist(liveStateRef.current.standardPlaylist);
        setCurrentIndex(0);
    };

    // Reads live refs instead of closure state so a timer that fires after
    // other state changed still acts on the current playlist. Events carry the
    // playbackKey of the media they belong to; anything else is ignored.
    const handleMediaEnd = (playbackKey) => {
        const media = activeMediaRef.current;
        if (!media || media.playbackKey !== playbackKey) return;
        const { currentPlaylist, currentIndex, scenePlaylist, announcement } = liveStateRef.current;
        const current = resolvedRef.current;
        if (!currentPlaylist || media.playlist !== currentPlaylist) return;
        if (!current || current.playlist !== currentPlaylist) return;
        const items = current.items;
        if (items.length === 0) return;

        if (currentIndex + 1 < items.length) {
            setCurrentIndex(currentIndex + 1);
            return;
        }
        // A scene plays once and hands back to the standard playlist; while an
        // announcement is showing it loops instead.
        if (scenePlaylist && !announcement) {
            endScene();
            return;
        }
        setCurrentIndex(0);
        setPlayToken(t => t + 1);
    };

    const handleMediaError = (playbackKey) => {
        setActiveMedia(prev => prev && prev.playbackKey === playbackKey ? { ...prev, failed: true } : prev);
    };

    // The playlist is resolved against the media library once per playlist
    // change; items whose media no longer exists are dropped so playback
    // cannot stall on them.
    useEffect(() => {
        if (!currentPlaylist) {
            setResolved(null);
            setActiveMedia(null);
            return;
        }
        const rawItems = currentPlaylist.items || [];
        if (rawItems.length === 0) {
            setResolved({ playlist: currentPlaylist, items: [] });
            return;
        }
        let cancelled = false;
        (async () => {
            let items = [];
            try {
                const allMedia = await window.electronAPI.loadMedia();
                items = rawItems
                    .map(item => {
                        const found = allMedia.find(m => m.id === item.id);
                        return found ? { ...found, duration: Math.max(1, Number(item.duration) || 5) } : null;
                    })
                    .filter(Boolean);
            } catch (err) {
                console.error('[OutputView] media library unavailable', err);
            }
            if (!cancelled) setResolved({ playlist: currentPlaylist, items });
        })();
        return () => { cancelled = true; };
    }, [currentPlaylist]);

    // playbackKey changes on every advance so a <video> remounts (and replays)
    // even when the same media follows itself or a single-item playlist loops.
    useEffect(() => {
        if (!resolved || resolved.playlist !== currentPlaylist) return;
        if (resolved.items.length === 0) {
            if (liveStateRef.current.scenePlaylist) endScene();
            else setActiveMedia(null);
            return;
        }
        const item = resolved.items[Math.min(currentIndex, resolved.items.length - 1)];
        playbackCounterRef.current += 1;
        setActiveMedia({ ...item, playlist: resolved.playlist, playbackKey: playbackCounterRef.current });
    }, [resolved, currentPlaylist, currentIndex, playToken]);

    // Videos advance via onEnded, everything else on a timer. Media that failed
    // to load is skipped after a short dwell instead of blocking the playlist.
    useEffect(() => {
        if (!activeMedia) return;
        if (activeMedia.type === 'video' && !activeMedia.failed) return;
        const seconds = activeMedia.failed ? 1 : (activeMedia.duration || 5);
        const timer = setTimeout(() => handleMediaEnd(activeMedia.playbackKey), seconds * 1000);
        return () => clearTimeout(timer);
    }, [activeMedia]);

    // --- RENDER ---
    // Overlay is visible ONLY if:
    // 1. showScoreboard is TRUE (or the inline countdown needs the scoreboard)
    // 2. No Scene is active AND
    // 3. Standard Mode is NOT 'FULL'
    // Note: We allow overlay without activeMedia (showing over test image)
    // The fullscreen countdown bypasses this and also covers a 'FULL' playlist.
    const countdownVisible = gameState.countdownActive && !!gameState.kickoffAt
        && !scenePlaylist && !announcement && !substitution && !card;
    const fullscreenCountdown = countdownVisible && countdownFullscreen;
    const showOverlay = (showScoreboard || (countdownVisible && !countdownFullscreen))
        && !scenePlaylist && standardMode !== 'FULL';

    // Outer container: Centers the output view in the window (Letterboxing)
    return (
        <div ref={outerRef} style={{
            backgroundColor: preview ? 'transparent' : '#000',
            height: '100%',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
        }}>
            {/* Inner Container: Fixed resolution based on settings */}
            <div className="output-canvas" style={{
                width: preview ? '100%' : outputSize.width,
                height: preview ? '100%' : outputSize.height,
                aspectRatio: preview ? `${outputSize.width} / ${outputSize.height}` : undefined,
                transform: preview ? undefined : `scale(${scale})`,
                transformOrigin: 'center',
                flex: preview ? undefined : '0 0 auto',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: 'black',
                containerType: 'size', // Key for using cqw/cqh units
                border: preview ? '1px solid #333' : undefined
            }}>

                {/* MEDIA LAYER */}
                <div style={{ width: '100%', height: '100%' }}>
                    <PlaylistScene
                        activeMedia={activeMedia}
                        currentTestImage={currentTestImage}
                        showCropMarks={showCropMarks}
                        onMediaEnd={handleMediaEnd}
                        onMediaError={handleMediaError}
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
                    opacity: (showOverlay || announcement || substitution || card || fullscreenCountdown) ? 1 : 0,
                }}>

                    {card ? (
                        <CardScene type={card.type} playerNr={card.playerNr} />
                    ) : substitution ? (
                        <SubstitutionScene inNr={substitution.inNr} outNr={substitution.outNr} />
                    ) : announcement ? (
                        <AnnouncementScene message={announcement} />
                    ) : fullscreenCountdown ? (
                        <CountdownScene display={countdownDisplay} />
                    ) : (
                        <ScoreboardScene
                            gameState={gameState}
                            timerDisplay={timerDisplay}
                            countdownDisplay={countdownVisible ? countdownDisplay : null}
                            homeLogoPath={homeLogoPath}
                            guestLogoPath={guestLogoPath}
                            bgPath={scoreboardBgPath}
                            sponsorPath={scoreboardSponsorPath}
                        />
                    )}

                </div>

            </div>
        </div>
    );
}

export default OutputView;

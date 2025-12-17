import { useState, useEffect, useRef } from 'react';

function OutputView() {
    const [activeMedia, setActiveMedia] = useState(null); // Current displayed media
    const [playlist, setPlaylist] = useState(null); // Active playlist object
    const [playlistIndex, setPlaylistIndex] = useState(0); // Current position in playlist
    const [overlayMedia, setOverlayMedia] = useState(null); // Priority media (Goal etc)

    const [gameState, setGameState] = useState({
        homeScore: 0,
        guestScore: 0,
        half: 1,
        kickoffTime: ''
    });

    const timerRef = useRef(null);

    // --- COMMAND HANDLING ---
    useEffect(() => {
        // Listen for commands from Controller
        if (window.electronAPI.onControlCommand) {
            const removeListener = window.electronAPI.onControlCommand((event, { command, payload }) => {
                console.log('Output Command:', command, payload);

                if (command === 'PLAY_PLAYLIST') {
                    if (!payload || !payload.items || payload.items.length === 0) return;
                    setPlaylist(payload);
                    setPlaylistIndex(0);
                    loadMediaItem(payload.items[0]);
                }

                if (command === 'SHOW_OVERLAY') {
                    setOverlayMedia(payload); // Interrupts playlist
                }

                if (command === 'UPDATE_GAME_STATE') {
                    setGameState(prev => ({ ...prev, ...payload }));
                }
            });
            return () => removeListener();
        }
    }, []);

    // --- PLAYLIST LOGIC ---
    const loadMediaItem = async (item) => {
        // Fetch full media details using ID
        const allMedia = await window.electronAPI.loadMedia(); // Naive implementation, better: cache or pass full object
        const media = allMedia.find(m => m.id === item.id);

        if (media) {
            setActiveMedia({ ...media, duration: item.duration });
        }
    };

    const nextPlaylistItem = () => {
        if (!playlist) return;

        let nextIndex = playlistIndex + 1;
        if (nextIndex >= playlist.items.length) {
            nextIndex = 0; // Loop
        }

        setPlaylistIndex(nextIndex);
        loadMediaItem(playlist.items[nextIndex]);
    };

    // --- TIMING LOGIC (IMAGES) ---
    useEffect(() => {
        // If we are showing an image from playlist (not overlay), set timer for next
        if (!overlayMedia && activeMedia && activeMedia.type === 'image') {
            const duration = activeMedia.duration || 5;
            timerRef.current = setTimeout(() => {
                nextPlaylistItem();
            }, duration * 1000);

            return () => clearTimeout(timerRef.current);
        }
    }, [activeMedia, overlayMedia, playlistIndex]); // Re-run when media changes

    // --- RENDER ---
    // Decision: What to show? Overlay > ActiveMedia > Black
    const mediaToShow = overlayMedia || activeMedia;

    if (!mediaToShow) {
        return (
            <div style={{ backgroundColor: '#1a1a1a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h1 style={{ color: '#444' }}>Scoreboard Output</h1>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: 'black',
            height: '100vh',
            width: '100vw',
            position: 'relative',
            overflow: 'hidden'
        }}>

            {/* MEDIA LAYER */}
            <div style={{ width: '100%', height: '100%' }}>
                {mediaToShow.type === 'video' ? (
                    <video
                        key={mediaToShow.id} // Force re-render on change
                        src={`file://${mediaToShow.path}`}
                        autoPlay
                        muted={false}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onEnded={() => {
                            if (overlayMedia) {
                                setOverlayMedia(null); // Finish overlay, return to playlist
                            } else {
                                nextPlaylistItem(); // Next in playlist
                            }
                        }}
                    />
                ) : (
                    <img
                        src={`file://${mediaToShow.path}`}
                        alt="Display"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                )}
            </div>

            {/* SCOREBOARD OVERLAY LAYER (Always on top) */}
            <div style={{
                position: 'absolute',
                top: 20, left: 20,
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: '2rem',
                fontWeight: 'bold',
                display: 'flex',
                gap: '20px',
                zIndex: 1000
            }}>
                <span>{gameState.homeScore} : {gameState.guestScore}</span>
                <span style={{ fontSize: '1rem', alignSelf: 'center', color: '#aaa' }}>{gameState.half}. HZ</span>
            </div>

        </div>
    );
}

export default OutputView;

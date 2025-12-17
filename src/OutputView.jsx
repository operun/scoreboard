import { useState, useEffect } from 'react';

function OutputView() {
    const [media, setMedia] = useState(null);

    useEffect(() => {
        // Listen for media display events from main process
        const handleUpdate = (event, data) => {
            console.log('Output received media:', data);
            setMedia(data);
        };

        // We need to expose this in preload or use the existing electronAPI structure
        // Since direct ipcRenderer usage is context-isolated, we need a method in preload.
        // I'll assume we add 'onUpdateOutput' to preload.
        if (window.electronAPI.onUpdateOutput) {
            const removeListener = window.electronAPI.onUpdateOutput(handleUpdate);
            return () => removeListener();
        }
    }, []);

    if (!media) {
        return (
            <div style={{
                backgroundColor: '#1a1a1a',
                height: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    width: '80%',
                    aspectRatio: '16/9',
                    border: '2px dashed #444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#444'
                }}>
                    <h1>Scoreboard Output</h1>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: '#1a1a1a',
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'relative',
                width: '90%', // Leave some space around as requested
                height: '90%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #333', // Visual guide
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                backgroundColor: 'black'
            }}>
                {media.type === 'video' ? (
                    <video
                        src={`file://${media.path}`}
                        autoPlay
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onEnded={() => {
                            // Optional: Report back that video ended
                        }}
                    />
                ) : (
                    <img
                        src={`file://${media.path}`}
                        alt="Display"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                )}
            </div>
        </div>
    );
}

export default OutputView;

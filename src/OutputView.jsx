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
            <div style={{ backgroundColor: 'black', height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Black screen by default or logo */}
                <h1 style={{ color: '#333' }}>Scoreboard Output</h1>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'black', height: '100vh', width: '100vw', overflow: 'hidden' }}>
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
    );
}

export default OutputView;

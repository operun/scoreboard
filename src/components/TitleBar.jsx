import { useEffect, useState } from 'react';

function TitleBar({ title }) {
    const [windowTitle, setWindowTitle] = useState(title || document.title);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setWindowTitle(document.title);
        });
        observer.observe(document.querySelector('title'), { subtree: true, characterData: true, childList: true });
        return () => observer.disconnect();
    }, []);

    return (
        <div style={{
            height: '35px',
            background: '#000000', // Deep black as requested
            color: '#cccccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            userSelect: 'none',
            WebkitAppRegion: 'drag', // Electron drag
            width: '100%',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            boxShadow: '0 1px 0 #333' // Subtle separator
        }}>
            {/* Spacer for Mac Traffic Lights (Left) */}
            <div style={{ width: '80px', height: '100%', WebkitAppRegion: 'no-drag' }}></div>

            <div style={{ flex: 1, textAlign: 'center', fontWeight: 500 }}>
                {windowTitle}
            </div>

            {/* Spacer for potential Windows Controls (Right) if needed, but centering handles it. */}
            <div style={{ width: '80px', height: '100%' }}></div>
        </div>
    );
}

export default TitleBar;

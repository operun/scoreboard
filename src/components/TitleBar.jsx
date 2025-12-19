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
            {window.electronAPI.platform !== 'darwin' ? (
                <div style={{ width: '138px', height: '100%', display: 'flex', WebkitAppRegion: 'no-drag' }}>
                    <div
                        onClick={() => window.electronAPI.minimizeWindow()}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#333'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4.399V5.5H0V4.399h11z" fill="#cccccc" />
                        </svg>
                    </div>
                    <div
                        onClick={() => window.electronAPI.maximizeWindow()}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#333'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.1 0v11H0V0h1.1zm9.9 0v11H9.9V0H11zM2.2 0h6.6v1.1H2.2V0zm6.6 9.9H2.2V11h6.6V9.9z" fill="#cccccc" />
                        </svg>
                    </div>
                    <div
                        onClick={() => window.electronAPI.closeWindow()}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#e81123'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.279 5.5L11 10.221l-.779.779L5.5 6.279.779 11 0 10.221 4.721 5.5 0 .779.779 0 5.5 4.721 10.221 0 11 .779 6.279 5.5z" fill="#cccccc" />
                        </svg>
                    </div>
                </div>
            ) : (
                <div style={{ width: '80px', height: '100%' }}></div>
            )}
        </div>
    );
}

export default TitleBar;

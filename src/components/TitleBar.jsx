import { useEffect, useState } from 'react';

const PoweredBy = ({ justify = 'flex-end' }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: justify, gap: '4px', height: '100%', paddingInline: '12px' }}>
        <span style={{ fontSize: '12px', opacity: 0.5, fontWeight: 400, whiteSpace: 'nowrap' }}>
            powered by
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, opacity: 0.6, letterSpacing: '0.03em' }}>
            operun
        </span>
    </div>
);

function TitleBar({ title }) {
    const [windowTitle, setWindowTitle] = useState(title || document.title);
    const isMac = window.electronAPI.platform === 'darwin';

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setWindowTitle(document.title);
        });
        observer.observe(document.querySelector('title'), { subtree: true, characterData: true, childList: true });
        return () => observer.disconnect();
    }, []);

    return (
        <div
            className="d-flex align-items-center border-bottom"
            style={{
                height: '35px',
                userSelect: 'none',
                WebkitAppRegion: 'drag',
                width: '100%',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 9999,
                backgroundColor: 'var(--bs-body-bg)',
                color: 'var(--bs-body-color)',
                borderColor: 'var(--bs-border-color) !important'
            }}>

            {isMac ? (
                <>
                    {/* Mac: traffic light spacer left */}
                    <div style={{ width: '80px', flexShrink: 0, WebkitAppRegion: 'no-drag' }} />

                    {/* Title centered */}
                    <div style={{ flex: 1, textAlign: 'center', fontWeight: 500, fontSize: '13px' }}>
                        {windowTitle}
                    </div>

                    {/* Branding right — matches left spacer width for perfect centering */}
                    <div style={{ width: '80px', flexShrink: 0, WebkitAppRegion: 'no-drag' }}>
                        <PoweredBy justify="flex-end" />
                    </div>
                </>
            ) : (
                <>
                    {/* Windows: branding left (reuses the spacer slot) */}
                    <div style={{ width: '140px', flexShrink: 0, WebkitAppRegion: 'no-drag' }}>
                        <PoweredBy justify="flex-start" />
                    </div>

                    {/* Title centered */}
                    <div style={{ flex: 1, textAlign: 'center', fontWeight: 500, fontSize: '13px' }}>
                        {windowTitle}
                    </div>

                    {/* Window controls right — exactly 138px (3 × 46px) */}
                    <div style={{ width: '138px', flexShrink: 0, display: 'flex', height: '100%', WebkitAppRegion: 'no-drag' }}>
                        {[
                            { action: 'minimizeWindow', hoverBg: 'var(--bs-tertiary-bg)', icon: <path d="M11 4.399V5.5H0V4.399h11z" /> },
                            { action: 'maximizeWindow', hoverBg: 'var(--bs-tertiary-bg)', icon: <path d="M1.1 0v11H0V0h1.1zm9.9 0v11H9.9V0H11zM2.2 0h6.6v1.1H2.2V0zm6.6 9.9H2.2V11h6.6V9.9z" /> },
                            { action: 'closeWindow', hoverBg: '#e81123', icon: <path d="M6.279 5.5L11 10.221l-.779.779L5.5 6.279.779 11 0 10.221 4.721 5.5 0 .779.779 0 5.5 4.721 10.221 0 11 .779 6.279 5.5z" /> },
                        ].map(({ action, hoverBg, icon }) => (
                            <div
                                key={action}
                                onClick={() => window.electronAPI[action]()}
                                className="d-flex align-items-center justify-content-center"
                                style={{ flex: 1, cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.background = hoverBg}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    {icon}
                                </svg>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default TitleBar;

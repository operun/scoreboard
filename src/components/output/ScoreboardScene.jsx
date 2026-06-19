function ScoreboardScene({ gameState, timerDisplay, homeLogoPath, guestLogoPath, bgPath, sponsorPath }) {
    // Score-Schrift dynamisch verkleinern, wenn eine Seite mehrstellig wird –
    // so bleibt die Score-Gruppe schmal (Logos groß) und der Doppelpunkt zentriert.
    const maxDigits = Math.max(
        String(gameState.homeScore ?? 0).length,
        String(gameState.guestScore ?? 0).length,
    );
    const scoreFontSize = maxDigits >= 3 ? '22cqh' : maxDigits === 2 ? '29cqh' : '36cqh';
    const colonFontSize = maxDigits >= 3 ? '16cqh' : maxDigits === 2 ? '22cqh' : '27cqh';

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>

            {/* Background layer */}
            {bgPath ? (
                <img
                    src={bgPath}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                />
            ) : (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: '#111', zIndex: 0 }} />
            )}

            {/* Grid overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                display: 'grid',
                gridTemplateRows: '1fr 2fr 1fr',
                padding: '3cqh 4cqw',
                boxSizing: 'border-box',
            }}>

                {/* Row 1: Timer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.3em',
                }}>
                    <div style={{
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        fontSize: '8cqh',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em',
                        padding: '0.15em 0.5em',
                        borderRadius: '0.2em',
                    }}>
                        {gameState.matchState === 'POST_GAME' ? 'Endstand' : timerDisplay}
                    </div>

                    {gameState.matchState !== 'POST_GAME' && gameState.overtime > 0 && (

                        <div style={{
                            backgroundColor: '#e00',
                            color: '#fff',
                            fontSize: '6cqh',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            padding: '0.15em 0.5em',
                            borderRadius: '0.2em',
                        }}>
                            +{gameState.overtime}
                        </div>
                    )}
                </div>

                {/* Row 2: Home Logo | Score | Away Logo.
                    Äußeres Grid (gleiche fr-Spalten) zentriert die Score-Gruppe
                    unabhängig von der Logo-Größe. Die Gruppe selbst ist auto-breit,
                    Logos bekommen den restlichen Platz. */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
                    alignItems: 'center',
                    columnGap: '2cqw',
                }}>
                    {/* Home Logo */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
                        {homeLogoPath && (
                            <img
                                src={homeLogoPath}
                                alt="Home"
                                style={{ maxHeight: '50cqh', maxWidth: '100%', objectFit: 'contain' }}
                            />
                        )}
                    </div>

                    {/* Score-Gruppe: inneres Grid 1fr auto 1fr. Die gleichen fr-Spalten
                        gleichen sich auf die Breite der tatsächlich breiteren Zahl an
                        – Doppelpunkt bleibt mittig, einstellige Stände bleiben schmal. */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        alignItems: 'center',
                        columnGap: '0.2em',
                    }}>
                        {/* Home Score */}
                        <span style={{
                            justifySelf: 'end',
                            color: '#fff',
                            fontSize: scoreFontSize,
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            lineHeight: 1,
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                        }}>{gameState.homeScore}</span>

                        {/* Doppelpunkt – auf der Mittellinie */}
                        <span style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: colonFontSize,
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            lineHeight: 1,
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                        }}>:</span>

                        {/* Guest Score */}
                        <span style={{
                            justifySelf: 'start',
                            color: '#fff',
                            fontSize: scoreFontSize,
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            lineHeight: 1,
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                        }}>{gameState.guestScore}</span>
                    </div>

                    {/* Away Logo */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
                        {guestLogoPath && (
                            <img
                                src={guestLogoPath}
                                alt="Away"
                                style={{ maxHeight: '50cqh', maxWidth: '100%', objectFit: 'contain' }}
                            />
                        )}
                    </div>
                </div>

                {/* Row 3: Sponsor */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {sponsorPath && (
                        <img
                            src={sponsorPath}
                            alt="Sponsor"
                            style={{ maxHeight: '15cqh', maxWidth: '30cqw', objectFit: 'contain' }}
                        />
                    )}
                </div>

            </div>
        </div>
    );
}

export default ScoreboardScene;

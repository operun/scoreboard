function ScoreboardScene({ gameState, timerDisplay, homeLogoPath, guestLogoPath, bgPath, sponsorPath }) {
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

                {/* Row 2: Home Logo | Home Score | : | Away Score | Away Logo */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '1cqw',
                }}>
                    {/* Home Logo */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {homeLogoPath && (
                            <img
                                src={homeLogoPath}
                                alt="Home"
                                style={{ maxHeight: '50cqh', maxWidth: '40cqw', objectFit: 'contain' }}
                            />
                        )}
                    </div>

                    {/* Score */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        margin: '0 3cqw',
                    }}>
                        <span style={{
                            color: '#fff',
                            fontSize: '40cqh',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            lineHeight: 1,
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                        }}>{gameState.homeScore}</span>
                        <span style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '30cqh',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            lineHeight: 1,
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                        }}>:</span>
                        <span style={{
                            color: '#fff',
                            fontSize: '40cqh',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            lineHeight: 1,
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                        }}>{gameState.guestScore}</span>
                    </div>

                    {/* Away Logo */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                        {guestLogoPath && (
                            <img
                                src={guestLogoPath}
                                alt="Away"
                                style={{ maxHeight: '50cqh', maxWidth: '40cqw', objectFit: 'contain' }}
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

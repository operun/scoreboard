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

                {/* Row 2: Home Logo | Score (fix zentriert) | Away Logo */}
                <div style={{ position: 'relative' }}>
                    {/* Logos – linke und rechte Hälfte */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        alignItems: 'center',
                    }}>
                        {/* Home Logo – nur linkes Drittel */}
                        <div style={{
                            position: 'absolute',
                            left: 0,
                            width: '30%',          // nur linkes Drittel
                            top: 0,
                            bottom: 0,
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            paddingRight: '1cqw',
                            boxSizing: 'border-box',
                        }}>
                            {homeLogoPath && (
                                <img
                                    src={homeLogoPath}
                                    alt="Home"
                                    style={{ maxHeight: '90%', maxWidth: '100%', objectFit: 'contain' }}
                                />
                            )}
                        </div>

                        {/* Guest Logo – nur rechtes Drittel */}
                        <div style={{
                            position: 'absolute',
                            right: 0,
                            width: '30%',          // nur rechtes Drittel
                            top: 0,
                            bottom: 0,
                            display: 'flex',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            paddingLeft: '1cqw',
                            boxSizing: 'border-box',
                        }}>
                            {guestLogoPath && (
                                <img
                                    src={guestLogoPath}
                                    alt="Away"
                                    style={{ maxHeight: '90%', maxWidth: '100%', objectFit: 'contain' }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Score – : exakt auf Mittellinie, Ziffern symmetrisch links/rechts */}
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}>
                        {/* Home Score */}
                        <div style={{
                            position: 'absolute',
                            right: '50%',
                            marginRight: '2cqw',
                            display: 'flex',
                            justifyContent: 'flex-end',
                        }}>
                            <span style={{
                                color: '#fff',
                                fontSize: '40cqh',
                                fontWeight: 'bold',
                                fontFamily: 'monospace',
                                lineHeight: 1,
                                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                            }}>{gameState.homeScore}</span>
                        </div>

                        {/* Doppelpunkt – exakt auf left: 50% */}
                        <span style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '30cqh',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            lineHeight: 1,
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                        }}>:</span>

                        {/* Guest Score */}
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            marginLeft: '2cqw',
                            display: 'flex',
                            justifyContent: 'flex-start',
                        }}>
                            <span style={{
                                color: '#fff',
                                fontSize: '40cqh',
                                fontWeight: 'bold',
                                fontFamily: 'monospace',
                                lineHeight: 1,
                                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                            }}>{gameState.guestScore}</span>
                        </div>
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

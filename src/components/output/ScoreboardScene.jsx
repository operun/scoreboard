function ScoreboardScene({ gameState, timerDisplay }) {
    return (
        <div style={{
            width: '40cqw', // Changed vw to cqw
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
        }}>

            {/* Timer Only */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '8cqh',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                letterSpacing: '0.1em',
                position: 'absolute',
                top: '0.1em',
            }}>

                <div style={{
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    fontSize: '8cqh',
                    padding: '0.2em 0.5em',
                }}>
                    {timerDisplay}
                </div>


                {gameState.overtime > 0 && (
                    <div style={{
                        backgroundColor: '#ff0000',
                        fontSize: '6cqh',
                        marginLeft: '0.2em',
                        padding: '0.2em 0.5em',
                    }}>
                        +{gameState.overtime}
                    </div>
                )}

            </div>

            {/* Teams & Score */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                width: '100%',
                alignItems: 'center',
                marginBottom: '15cqh' // Changed vh to cqh
            }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '30cqh', fontWeight: 'bold', lineHeight: 1, color: 'white' }}>
                        {gameState.homeScore}
                    </div>
                </div>

                <div style={{ color: '#fff', fontSize: '20cqh', marginTop: '10cqh' }}>:</div>

                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '30cqh', fontWeight: 'bold', lineHeight: 1, color: 'white' }}>
                        {gameState.guestScore}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ScoreboardScene;

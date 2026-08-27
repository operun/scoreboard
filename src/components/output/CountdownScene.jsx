import bgImage from '../../assets/szene.png';

function CountdownScene({ display }) {
    if (!display) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 1000
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                alignItems: 'center',
            }}>
                <span style={{ color: '#aaa', fontSize: '4cqw', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Anpfiff in
                </span>

                <span style={{
                    color: '#fff',
                    fontSize: '14cqw',
                    fontWeight: 'bold',
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                }}>
                    {display}
                </span>
            </div>
        </div>
    );
}

export default CountdownScene;

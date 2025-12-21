import bgImage from '../../assets/szene.png';

function CardScene({ type, playerNr }) {
    if (!type || !playerNr) return null;

    const isRed = type === 'red';
    const color = isRed ? '#ff0000' : '#ffff00'; // Bootstrap Danger / Warning colors roughly
    const label = isRed ? 'Rote Karte' : 'Gelbe Karte';

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
                {/* Visual Card */}
                <div style={{
                    width: '12cqw',
                    height: '18cqw',
                    backgroundColor: color,
                    borderRadius: '10px',
                    border: '2px solid #fff'
                }}></div>

                {/* Label */}
                <span style={{ color: '#eee', fontSize: '5cqw', textTransform: 'uppercase' }}>
                    {label}
                </span>

                {/* Number */}
                <span style={{ color: '#fff', fontSize: '7cqw', fontWeight: 'bold' }}>
                    Spieler #{playerNr}
                </span>

            </div>
        </div>
    );
}

export default CardScene;

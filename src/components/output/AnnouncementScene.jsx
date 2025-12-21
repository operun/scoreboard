import bgImage from '../../assets/szene.png';

function AnnouncementScene({ message }) {
    if (!message) return null;
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
                padding: '10px',
                color: '#fff',
                fontSize: '6cqw',
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: '10px',
                whiteSpace: 'pre-wrap',
                letterSpacing: '0.1em',
            }}>
                {message}
            </div>
        </div>
    );
}

export default AnnouncementScene;

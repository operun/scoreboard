function AnnouncementScene({ message }) {
    if (!message) return null;
    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)', // Dim background
            zIndex: 1000
        }}>
            <div style={{
                width: '80%',
                padding: '40px',
                backgroundColor: 'rgba(0,0,0,0.85)',
                color: '#fff',
                fontSize: '6cqw',
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: '20px',
                whiteSpace: 'pre-wrap',
                letterSpacing: '0.1em',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}>
                {message}
            </div>
        </div>
    );
}

export default AnnouncementScene;

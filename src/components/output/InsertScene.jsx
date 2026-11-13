function InsertScene({ path }) {
    if (!path) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: '#000',
            zIndex: 1000
        }}>
            <img
                src={path}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
        </div>
    );
}

export default InsertScene;

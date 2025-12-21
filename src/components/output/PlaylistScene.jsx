function PlaylistScene({ activeMedia, currentTestImage, showCropMarks, onMediaEnd, preview }) {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            {activeMedia ? (
                activeMedia.type === 'video' ? (
                    <video
                        key={activeMedia.id}
                        src={`file://${activeMedia.path}`}
                        autoPlay
                        muted={preview ? true : false}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onEnded={onMediaEnd}
                    />
                ) : (
                    <img
                        src={`file://${activeMedia.path}`}
                        alt="Content"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                )
            ) : (
                <>
                    <img
                        src={currentTestImage}
                        alt="Testbild"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Schnittmarken (Crop Marks) */}
                    {showCropMarks && (
                        <>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: '6px solid #f00', borderLeft: '6px solid #f00', zIndex: 100 }} />
                            <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: '6px solid #f00', borderRight: '6px solid #f00', zIndex: 100 }} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: '6px solid #f00', borderLeft: '6px solid #f00', zIndex: 100 }} />
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '6px solid #f00', borderRight: '6px solid #f00', zIndex: 100 }} />
                            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '40px', height: '2px', backgroundColor: '#f00', transform: 'translate(-50%, -50%)', zIndex: 100 }} />
                            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '2px', height: '40px', backgroundColor: '#f00', transform: 'translate(-50%, -50%)', zIndex: 100 }} />
                        </>
                    )}
                </>
            )}
        </div>
    );
}

export default PlaylistScene;

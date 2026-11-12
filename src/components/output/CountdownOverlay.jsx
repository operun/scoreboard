function CountdownOverlay({ display, corner }) {
    if (!display) return null;

    const vertical = corner.startsWith('top') ? { top: '4cqh' } : { bottom: '4cqh' };
    const horizontal = corner.endsWith('left') ? { left: '3cqw' } : { right: '3cqw' };

    return (
        <div style={{
            position: 'absolute',
            ...vertical,
            ...horizontal,
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontSize: '9cqh',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            lineHeight: 1.1,
            padding: '0.2em 0.5em',
            borderRadius: '0.2em',
        }}>
            <span style={{
                color: '#aaa',
                fontSize: '0.35em',
                fontWeight: 'normal',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
            }}>
                Anpfiff in
            </span>
            {display}
        </div>
    );
}

export default CountdownOverlay;

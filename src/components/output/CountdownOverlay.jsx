function CountdownOverlay({ display, position }) {
    if (!display) return null;

    const vertical = position.startsWith('top') ? { top: '4cqh' } : { bottom: '4cqh' };
    const horizontal = position.endsWith('left') ? { left: '3cqw' }
        : position.endsWith('right') ? { right: '3cqw' }
        : { left: '50%', transform: 'translateX(-50%)' };

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

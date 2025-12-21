import szeneImg from '../../../assets/szene.png';

function DefaultScene({ title }) {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <img src={szeneImg} alt="Default Scene" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.2)'
            }}>
                <div style={{
                    padding: '20px 40px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderRadius: '15px',
                    color: 'white',
                    fontSize: '8cqw',
                    fontWeight: 'bold',
                    textAlign: 'center'
                }}>
                    {title}
                </div>
            </div>
        </div>
    );
}

export default DefaultScene;

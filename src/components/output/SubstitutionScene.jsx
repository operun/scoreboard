import bgImage from '../../assets/szene.png';
import { FaArrowCircleUp, FaArrowCircleDown } from "react-icons/fa";

function SubstitutionScene({ inNr, outNr }) {
    if (!inNr && !outNr) return null;

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
                gap: '80px',
                alignItems: 'center',
            }}>
                {/* IN (Green) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <FaArrowCircleUp style={{ color: '#28a745', fontSize: '12cqw' }} />
                    <span style={{ color: '#fff', fontSize: '10cqw', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {inNr}
                    </span>
                    <span style={{ color: '#aaa', fontSize: '3cqw', textTransform: 'uppercase' }}>Rein</span>
                </div>

                {/* OUT (Red) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <FaArrowCircleDown style={{ color: '#dc3545', fontSize: '12cqw' }} />
                    <span style={{ color: '#fff', fontSize: '10cqw', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {outNr}
                    </span>
                    <span style={{ color: '#aaa', fontSize: '3cqw', textTransform: 'uppercase' }}>Raus</span>
                </div>
            </div>
        </div>
    );
}

export default SubstitutionScene;

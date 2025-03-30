import { BsFolder } from 'react-icons/bs';
import { BsGear } from 'react-icons/bs';
import { BsPlayCircle } from "react-icons/bs";

function Sidebar({ activeView, onChangeView }) {
  const mainItems = [
    { id: 'controller', icon: <BsPlayCircle />, label: 'Controller' },
    { id: 'media', icon: <BsFolder />, label: 'Media' },
  ];

  return (
    <div className="d-flex flex-column justify-content-between bg-black text-white" style={{ width: '60px', height: '100vh' }}>
      <div className="d-flex flex-column align-items-center pt-3 gap-3">
        {mainItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onChangeView(item.id)}
            title={item.label}
            className={`text-center fs-5 ${activeView === item.id ? 'text-white border-start border-white' : 'text-white-50 border border-0'} cursor-pointer`}
            style={{ width: '100%' }}
          >
            {item.icon}
          </div>
        ))}
      </div>

      <div className="d-flex flex-column align-items-center pb-3">
        <div
          onClick={() => onChangeView('settings')}
          title="Settings"
          className={`text-center fs-5 ${activeView === 'settings' ? 'text-white' : 'text-white-50'} cursor-pointer`}
          style={{ width: '100%' }}
        >
          <BsGear />
        </div>
      </div>
    </div>
  );
}

export default Sidebar;

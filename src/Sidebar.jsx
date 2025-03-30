import { BsFolder } from 'react-icons/bs';
import { BsGear } from 'react-icons/bs';
import { BsPlayCircle } from "react-icons/bs";

function Sidebar({ activeView, onChangeView }) {
  const mainItems = [
    { id: 'controller', icon: <BsPlayCircle />, label: 'Controller' },
    { id: 'media', icon: <BsFolder />, label: 'Media' },
    { id: 'settings', icon: <BsGear />, label: 'Settings' },
  ];

  return (
    <div className="d-flex flex-column justify-content-between bg-black text-white vh-100" style={{ width: '60px' }}>
      <div className="d-flex flex-column align-items-center pt-5 gap-3">
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
    </div>
  );
}

export default Sidebar;

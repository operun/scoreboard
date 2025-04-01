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
    <div className="justify-content-between">
      <div className="d-flex flex-column align-items-center gap-3 mt-2">
        {mainItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onChangeView(item.id)}
            title={item.label}
            className={`text-center fs-5 py-1 ${activeView === item.id ? 'text-white border-start border-white' : 'text-white-50 border-start border-black'} cursor-pointer`}
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

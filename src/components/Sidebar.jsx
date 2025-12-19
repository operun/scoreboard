import { BsFolder } from 'react-icons/bs';
import { BsGear } from 'react-icons/bs';
import { BsTv } from "react-icons/bs";
import { BsPlayCircle } from "react-icons/bs";
import { BsCollectionPlay } from "react-icons/bs";
import { BsArrowRepeat } from "react-icons/bs";

function SideBar({ activeView, onChangeView }) {
  const mainItems = [
    { id: 'controller', icon: <BsTv />, label: 'Controller' },
    { id: 'playlists', icon: <BsCollectionPlay />, label: 'Playlists' },
    { id: 'media', icon: <BsFolder />, label: 'Media' },
    { id: 'settings', icon: <BsGear />, label: 'Settings' },
    { id: 'sync', icon: <BsArrowRepeat />, label: 'Synchronisierung' },
  ];

  return (
    <div className="justify-content-between">
      <div className="d-flex flex-column align-items-center gap-3 mt-2">
        {mainItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onChangeView(item.id)}
            title={item.label}
            className={`text-center fs-5 py-2 ${activeView === item.id ? 'text-primary border-start border-primary border-3' : 'text-body-secondary border-start border-0'} cursor-pointer`}
            style={{ width: '100%', transition: 'all 0.2s', cursor: 'pointer' }}
            onMouseOver={(e) => { if (activeView !== item.id) e.currentTarget.classList.add('text-body'); }}
            onMouseOut={(e) => { if (activeView !== item.id) e.currentTarget.classList.remove('text-body'); }}
          >
            {item.icon}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SideBar;

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

function EditPlaylistView({ playlistId, onBack }) {
  const [allMedia, setAllMedia] = useState([]);
  const [playlist, setPlaylist] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const media = await window.electronAPI.loadMedia();
      const playlists = await window.electronAPI.loadPlaylists();
      const p = playlists.find(p => p.id === playlistId);
      setAllMedia(media);
      setPlaylist(p);
    };
    loadData();
  }, [playlistId]);

  const handleAdd = (media) => {
    if (playlist.items.find((item) => item.id === media.id)) return;
    const newItem = { id: media.id };
    if (media.type === 'image') newItem.duration = 5;
    setPlaylist({ ...playlist, items: [...playlist.items, newItem] });
  };

  const handleRemove = (id) => {
    const updatedItems = playlist.items.filter((item) => item.id !== id);
    setPlaylist({ ...playlist, items: updatedItems });
  };

  const handleDurationChange = (id, value) => {
    const items = playlist.items.map((item) =>
      item.id === id ? { ...item, duration: parseInt(value) || 0 } : item
    );
    setPlaylist({ ...playlist, items });
  };

  const handleSave = async () => {
    const updated = { ...playlist, updated: new Date().toISOString() };
    await window.electronAPI.savePlaylist(updated);
    toast.success('Playlist gespeichert');
  };

  if (!playlist) return null;

  return (

    <div className="container">
      <div className="row">
        <div className="col">

          <h1>{playlist.title} <small class="text-muted">(Playlist)</small></h1>

          <p className="lead mb-4">Du kannst die Reihenfolge per Drag and Drop bearbeiten.</p>

          <div className="d-flex mb-3">
            <button className="btn btn-outline-primary mb-3" onClick={onBack}>
              Zurück
            </button>
          </div>

          <h2>Auf dieser Playlist</h2>

          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Dauer</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
            {playlist.items.map((item) => {
              const media = allMedia.find((m) => m.id === item.id);
              return (
                <tr key={item.id}>
                  <td className="w-50">
                    {media?.fileName || item.id}
                  </td>
                  <td className="w-25">
                    {media?.type === 'image' && (
                      <input
                        type="number"
                        className="form-control form-control-sm me-2"
                        style={{ width: 80 }}
                        value={item.duration}
                        onChange={(e) => handleDurationChange(item.id, e.target.value)}
                      />
                    )}
                  </td>
                  <td className="w-25">
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemove(item.id)}>
                      Entfernen
                    </button>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}

export default EditPlaylistView;
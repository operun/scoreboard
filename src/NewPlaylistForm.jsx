import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

function NewPlaylistForm({ onSave }) {
  const [title, setTitle] = useState('');
  const [allMedia, setAllMedia] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      const media = await window.electronAPI.loadMedia();
      setAllMedia(media);
    };
    load();
  }, []);

  const handleAddItem = (media) => {
    const alreadyInList = items.find((i) => i.mediaId === media.id);
    if (alreadyInList) return;
    const newItem = { mediaId: media.id };
    if (media.type === 'image') {
      newItem.duration = 5; // default duration
    }
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (mediaId) => {
    setItems((prev) => prev.filter((i) => i.mediaId !== mediaId));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Bitte einen Titel angeben.');
      return;
    }

    const newPlaylist = {
      id: crypto.randomUUID(),
      title: title.trim(),
      updated: new Date().toISOString(),
      items
    };

    onSave(newPlaylist);
    setTitle('');
    setItems([]);
  };

  return (
    <div className="mb-5">
      <h2>Neue Playlist</h2>

      <div className="mb-3">
        <label className="form-label">Titel</label>
        <input
          type="text"
          className="form-control"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <h5>Medien zur Playlist hinzufügen</h5>
      <ul className="list-group mb-3">
        {allMedia.map((media) => (
          <li key={media.id} className="list-group-item d-flex justify-content-between">
            <span>{media.fileName}</span>
            <button className="btn btn-sm btn-outline-primary" onClick={() => handleAddItem(media)}>
              Hinzufügen
            </button>
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <>
          <h5>Ausgewählte Medien</h5>
          <ul className="list-group mb-3">
            {items.map((item, index) => {
              const media = allMedia.find((m) => m.id === item.mediaId);
              return (
                <li key={item.mediaId} className="list-group-item d-flex justify-content-between">
                  <span>
                    {media?.fileName}
                    {media?.type === 'image' && (
                      <small className="ms-2 text-muted">
                        ({item.duration}s)
                      </small>
                    )}
                  </span>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveItem(item.mediaId)}>
                    Entfernen
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <button className="btn btn-primary" onClick={handleSave}>
        Playlist speichern
      </button>
    </div>
  );
}

export default NewPlaylistForm;
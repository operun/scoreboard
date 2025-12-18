import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { BsPencil, BsXCircle } from 'react-icons/bs';

function PlaylistsView({ onEdit }) {
  const [playlists, setPlaylists] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await window.electronAPI.loadPlaylists();
      setPlaylists(data);
    };
    load();
  }, []);

  const handleAdd = async () => {
    if (!title.trim()) {
      toast.error('Bitte gib einen Titel an.');
      return;
    }

    const newPlaylist = {
      id: crypto.randomUUID(),
      title: title.trim(),
      updated: new Date().toISOString(),
      items: []
    };

    // Optimistic UI update
    const updated = [...playlists, newPlaylist];
    setPlaylists(updated);

    // Backend call with single item
    await window.electronAPI.savePlaylist(newPlaylist);

    toast.success('Playlist gespeichert');
    setTitle('');
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Playlist wirklich löschen?')) return;
    await window.electronAPI.deletePlaylist(id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    toast.success('Playlist gelöscht');
  };

  return (

    <div className="container">

      <div className="d-flex align-items-center mb-4">

        <div className="me-5">
          <h1>Playlisten</h1>
        </div>

        <button className="btn btn-outline-primary ms-auto" onClick={() => setShowForm(true)}>
          Playlist hinzufügen
        </button>

      </div>

      <div className="row">
        <div className="col">

          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Geändert</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {playlists.map((playlist) => (
                <tr key={playlist.id}>
                  <td className="w-75">{playlist.title}</td>
                  <td>{new Date(playlist.updated).toLocaleString('de-DE')}</td>
                  <td>
                    <span onClick={() => onEdit(playlist.id)} className="me-3" style={{ cursor: 'pointer' }}>
                      <BsPencil />
                    </span>
                    <span onClick={() => handleDelete(playlist.id)} className="text-danger" style={{ cursor: 'pointer' }}>
                      <BsXCircle />
                    </span>
                  </td>
                </tr>
              ))}
              {playlists.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-muted">Keine Playlists vorhanden.</td>
                </tr>
              )}
            </tbody>
          </table>

        </div>
      </div>

      {showForm && (
        <>
          <div className="offcanvas-backdrop fade show" onClick={() => setShowForm(false)}></div>
          <div
            className="offcanvas offcanvas-end fade show"
            tabIndex="-1"
            style={{
              visibility: 'visible',
              zIndex: 1045,
              width: '400px'
            }}
          >
            <div className="offcanvas-header">
              <h5 className="offcanvas-title">Neue Playlist</h5>
              <button type="button" className="btn-close" onClick={() => setShowForm(false)}></button>
            </div>
            <div className="offcanvas-body">
              <label className="form-label">Titel</label>
              <input
                type="text"
                className="form-control mb-3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleAdd}>
                Speichern
              </button>
            </div>
          </div>
        </>
      )}

    </div>

  );
}

export default PlaylistsView;

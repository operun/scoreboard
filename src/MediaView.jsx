import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

function MediaView() {
  const [mediaFiles, setMediaFiles] = useState([]);

  useEffect(() => {
    const loadMedia = async () => {
      const list = await window.electronAPI.loadMedia();
      setMediaFiles(list);
    };
    loadMedia();
  }, []);

  const handleAddMedia = async () => {
    const result = await window.electronAPI.addMedia();
    if (result.status === 'ok') {
      setMediaFiles((prev) => [...prev, result]);
      toast.success(`Die Datei ${result.fileName} wurde hinzugefügt.`);
    } else if (result.status === 'duplicate') {
      toast.info(`Die Datei ${result.fileName} existiert bereits.`);
    } else if (result.status === 'cancel') {
      // keine Aktion
    } else {
      toast.error('Fehler beim Hinzufügen');
    }
  };  

  const handleDeleteMedia = async (fileName) => {
    const result = await window.electronAPI.deleteMedia(fileName);
    if (result.status === 'ok') {
      setMediaFiles((prev) => prev.filter((f) => f.fileName !== fileName));
      toast.success(`Die Datei ${fileName} wurde gelöscht.`);
    } else {
      toast.error('Fehler beim Löschen');
    }
  };
  
  return (
    <div className="container">

      <div className="row">
        <div className="col">

          <h1>Medien</h1>
          <p className="lead mb-4">Cras justo odio, dapibus ac facilisis in, egestas eget quam. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Donec sed odio dui. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>

          <button className="btn btn-primary mb-3" onClick={handleAddMedia}>
            Video hinzufügen
          </button>

          <ul className="list-group">
            {mediaFiles.map((file, idx) => (
              <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                <span>
                  {file.fileName}
                  <small className="text-muted ms-2">{new Date(file.addedAt).toLocaleString()}</small>
                </span>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleDeleteMedia(file.fileName)}
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>

        </div>
      </div>

    </div>
  );

}

export default MediaView;

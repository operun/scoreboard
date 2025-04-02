import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

function MediaView() {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [offcanvasVisible, setOffcanvasVisible] = useState(false);

  const handleShow = (path) => {
    setSelectedFile(path);
    setTimeout(() => setOffcanvasVisible(true), 10);
  };

  const handleClose = () => {
    setOffcanvasVisible(false);
    setTimeout(() => setSelectedFile(null), 300);
  };

  useEffect(() => {
    const loadMedia = async () => {
      const list = await window.electronAPI.loadMedia();
      setMediaFiles(list);
    };
    loadMedia();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
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
              <li key={idx} className="list-group-item d-flex align-items-center">

                <span className="me-auto">
                  <span className="me-2">{file.fileName}</span>
                  <small className="text-muted">{new Date(file.addedAt).toLocaleString()}</small>
                </span>

                <button
                  className="btn btn-sm btn-outline-primary ms-2"
                  onClick={() => handleShow(file.path)}
                >
                  Anzeigen
                </button>

                <button
                  className="btn btn-sm btn-outline-danger ms-2"
                  onClick={() => handleDeleteMedia(file.fileName)}
                >
                  Löschen
                </button>

              </li>
            ))}
          </ul>

        </div>
      </div>

      {selectedFile && (
        <>
          <div
            className={`offcanvas-backdrop fade ${offcanvasVisible ? 'show' : ''}`}
            onClick={handleClose}
          ></div>

          <div
            className={`offcanvas offcanvas-end fade ${offcanvasVisible ? 'show' : ''}`}
            tabIndex="-1"
            style={{
              visibility: 'visible',
              zIndex: 1045,
              width: '600px'
            }}
          >
            <div className="offcanvas-header pt-4">
              <button
                type="button"
                className="btn-close"
                onClick={handleClose}
              ></button>
            </div>
            <div className="offcanvas-body">
              <video
                key={selectedFile}
                src={`file://${selectedFile}`}
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '80vh' }}
              />
            </div>
          </div>
        </>
      )}


    </div>
  );

}

export default MediaView;

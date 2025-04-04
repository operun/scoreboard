import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

function MediaView() {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [offcanvasVisible, setOffcanvasVisible] = useState(false);
  const videoRef = useRef(null);

  const handleShow = (path) => {
    setSelectedFile(path);
    setTimeout(() => setOffcanvasVisible(true), 10);
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
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

  const handleAddMedia = async (forceOptions = null) => {
    try {
      const result = forceOptions
        ? await window.electronAPI.addMedia(forceOptions)
        : await window.electronAPI.addMedia();

      if (result.status === 'ok') {
        setMediaFiles((prev) => [...prev, result]);
        toast.success(`Die Datei ${result.fileName} wurde hinzugefügt.`);
      } else if (result.status === 'duplicate-identical') {
        toast.info(`Die Datei "${result.fileName}" ist bereits vorhanden.`);
      } else if (result.status === 'duplicate-hash') {
        const confirm = window.confirm(
          `Diese Datei scheint identisch zu "${result.existingFileName}" zu sein. Trotzdem hinzufügen?`
        );
        if (confirm) {
          const cleanOriginalPath = String(result.originalPath);
          const cleanFileName = String(result.fileName);
          await handleAddMedia({
            force: true,
            originalPath: cleanOriginalPath,
            fileName: cleanFileName
          });
        } else {
          toast.info('Import abgebrochen.');
        }
      } else if (result.status === 'cancel') {
        // keine Aktion
      } else {
        toast.error('Fehler beim Hinzufügen.');
      }
    } catch (err) {
      console.error('[Renderer] Upload failed:', err);
      toast.error('Upload ist fehlgeschlagen.');
    }
  };

  const handleDeleteMedia = async (fileName) => {
    const confirmDelete = window.confirm(`Möchtest du die Datei "${fileName}" wirklich löschen?`);
    if (!confirmDelete) return;

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
          <p className="lead mb-4">Verwalte deine lokalen Mediendateien.</p>

          <button className="btn btn-primary mb-3" onClick={handleAddMedia}>
            Datei hinzufügen
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
                  onClick={() => handleShow(file)}
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
              <button type="button" className="btn-close" onClick={handleClose}></button>
            </div>
            <div className="offcanvas-body text-center">
              {selectedFile.type === 'video' && (
                <video
                  key={selectedFile.path}
                  ref={videoRef}
                  src={`file://${selectedFile.path}`}
                  controls
                  autoPlay
                  style={{ width: '100%', maxHeight: '80vh' }}
                />
              )}
              {selectedFile.type === 'image' && (
                <img
                  src={`file://${encodeURI(selectedFile.path)}`}
                  className='img-fluidx'
                  alt={selectedFile.fileName}
                  style={{ maxWidth: '100%', maxHeight: '80vh' }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MediaView;

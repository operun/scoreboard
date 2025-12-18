import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { BsXCircle, BsPlayCircle } from "react-icons/bs";

function MediaView() {
  const fileInputRef = useRef(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [offcanvasVisible, setOffcanvasVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  const videoRef = useRef(null);

  const handleShow = (file) => {
    setSelectedFile(file);
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

  const refreshMediaList = async () => {
    const list = await window.electronAPI.loadMedia();
    setMediaFiles(list);
  };

  const handleAddMedia = async (path) => {

    console.log('[Renderer] Aufruf mit:', path);
    const result = await window.electronAPI.addMedia(path);

    if (result.status === 'ok') {
      setMediaFiles((prev) => [...prev, result]);
      toast.success(`Die Datei "${result.fileName}" wurde hinzugefügt.`);
    } else if (result.status === 'known-hash') {
      toast.info(`Die Datei "${result.fileName}" existiert bereits.`);
    } else {
      toast.error('Fehler beim Hinzufügen.');
    }

    if (result.type === 'video') {
      setActiveTab('videos');
    } else if (result.type === 'image') {
      setActiveTab('images');
    }

    await refreshMediaList();

  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const paths = [...e.dataTransfer.files].map((file) => file.path);
    for (const path of paths) {
      await handleAddMedia(path);
    }
  };

  const handleDeleteMedia = async (id) => {
    const confirmDelete = window.confirm(`Möchtest du die Datei wirklich löschen?`);
    if (!confirmDelete) return;

    const result = await window.electronAPI.deleteMedia(id);
    if (result.status === 'ok') {
      setMediaFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success(`Die Datei wurde gelöscht.`);
    } else {
      toast.error('Fehler beim Löschen');
    }
  };

  const filteredMedia = mediaFiles.filter((file) =>
    activeTab === 'videos' ? file.type === 'video' : file.type === 'image'
  );

  return (
    <div
      className="container"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="d-flex align-items-center mb-4">

        <div className="me-5">
          <h1>Medien</h1>
        </div>

        <ul className="nav nav-underline me-auto">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'videos' ? 'active' : ''}`}
              onClick={() => setActiveTab('videos')}
            >
              Videos
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'images' ? 'active' : ''}`}
              onClick={() => setActiveTab('images')}
            >
              Bilder
            </button>
          </li>
        </ul>

        <button
          className="btn btn-outline-primary"
          onClick={async () => {
            const result = await window.electronAPI.openFileDialog();
            if (Array.isArray(result)) {
              for (const path of result) {
                await handleAddMedia(path);
              }
            }
          }}
        >
          Datei hinzufügen
        </button>
      </div>

      <div className="row">
        <div className="col">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Datum</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((file, idx) => (
                <tr>
                  <td className="w-75">{file.fileName}</td>
                  <td>{new Date(file.addedAt).toLocaleString('de-DE')}</td>
                  <td>
                    <span
                      className="me-2 text-success"
                      onClick={() => handleShow(file)}
                    >
                      <BsPlayCircle />
                    </span>
                    <span
                      className="me-2 text-danger"
                      onClick={() => handleDeleteMedia(file.id)}
                    >
                      <BsXCircle />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
            style={{ visibility: 'visible', zIndex: 1045, width: '600px' }}
          >
            <div className="offcanvas-header pt-4">
              <button type="button" className="btn-close" onClick={handleClose}></button>
            </div>
            <div className="offcanvas-body">
              {selectedFile.type === 'video' && (
                <video
                  key={selectedFile.id}
                  ref={videoRef}
                  src={`file://${encodeURI(selectedFile.path)}`}
                  controls
                  autoPlay
                  style={{ width: '100%', maxHeight: '80vh' }}
                />
              )}
              {selectedFile.type === 'image' && (
                <img
                  src={`file://${encodeURI(selectedFile.path)}`}
                  alt={selectedFile.fileName}
                  style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
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
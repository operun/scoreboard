import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { BsPlayCircle } from "react-icons/bs";

function ControllerView() {
  const [mediaFiles, setMediaFiles] = useState([]);

  useEffect(() => {
    const loadMedia = async () => {
      const list = await window.electronAPI.loadMedia();
      setMediaFiles(list);
    };
    loadMedia();
  }, []);

  const handlePlay = async (file) => {
    console.log('Sending to output:', file);
    try {
      const result = await window.electronAPI.triggerOutput(file);
      if (result.status === 'ok') {
        toast.success(`Spiele: ${file.fileName}`);
      } else {
        toast.error('Fehler: Output Fenster nicht gefunden!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Fehler bei der Kommunikation');
    }
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col">
          <h1>Regie / Controller</h1>
          <p className="lead">Klicke auf ein Medium, um es sofort auf dem Output-Screen anzuzeigen.</p>

          <div className="row row-cols-1 row-cols-md-3 g-4">
            {mediaFiles.map((file) => (
              <div key={file.id} className="col">
                <div className="card h-100" onClick={() => handlePlay(file)} style={{ cursor: 'pointer' }}>
                  <div className="card-body d-flex align-items-center justify-content-between">
                    <h5 className="card-title text-truncate mb-0" title={file.fileName}>{file.fileName}</h5>
                    <BsPlayCircle size={24} className="text-primary flex-shrink-0" />
                  </div>
                  <div className="card-footer text-muted small">
                    {file.type.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ControllerView;

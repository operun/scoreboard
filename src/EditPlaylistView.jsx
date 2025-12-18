import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { BsArrowLeft, BsPlusCircle, BsTrash, BsGripVertical, BsSave } from 'react-icons/bs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="card mb-2">
      <div className="card-body p-2 d-flex align-items-center">
        <span {...listeners} className="text-muted me-3" style={{ cursor: 'grab', flexShrink: 0 }}>
          <BsGripVertical size={20} />
        </span>
        <div className="flex-fill" style={{ minWidth: 0 }}>
          <h6 className="mb-0 text-truncate" title={props.media?.fileName || ''}>
            {props.media?.fileName || 'Unbekannte Datei'}
          </h6>
          <small className="text-muted">{props.media?.type?.toUpperCase()}</small>
        </div>

        <div className="mx-3 flex-shrink-0">
          <div className="input-group input-group-sm" style={{ width: 100 }}>
            <span className="input-group-text">Sek.</span>
            <input
              type="number"
              className="form-control"
              value={props.duration}
              onChange={(e) => props.onDurationChange(props.id, e.target.value)}
              min="1"
              disabled={props.media?.type === 'video'} // Read-only for videos
            />
          </div>
        </div>

        <button
          className="btn btn-sm btn-outline-danger"
          onClick={() => props.onRemove(props.id)}
          title="Entfernen"
        >
          <BsTrash />
        </button>
      </div>
    </div>
  );
}

function EditPlaylistView({ playlistId, onBack }) {
  const [allMedia, setAllMedia] = useState([]);
  const [playlist, setPlaylist] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleAdd = (mediaFile) => {
    // Generate a unique ID for the playlist item (different from media ID to allow duplicates if desired? 
    // Requirement says "Reihenfolge bearbeiten", usually allows duplicates in playlists.
    // Let's us a simple random ID for the ITEM, but store the mediaId.
    // Current data structure seems to be { id: mediaId, duration: x }.
    // If we want allow duplicates of same video, we need a structure like { uniqueId: uuid, mediaId: ..., duration: ... }
    // BUT looking at legacy code: playlist.items.find((item) => item.id === media.id)) return;
    // It prevented duplicates. I will STICK to that for now to avoid breaking schema if not intended.

    if (playlist.items.find((item) => item.id === mediaFile.id)) {
      toast.info('Das Medium ist bereits in der Liste.');
      return;
    }

    const newItem = { id: mediaFile.id };

    // Use media duration if available (Video), otherwise default 5s (Image)
    newItem.duration = mediaFile.duration || 5;

    setPlaylist({ ...playlist, items: [...playlist.items, newItem] });
    setHasChanges(true);
  };

  const handleRemove = (id) => {
    const updatedItems = playlist.items.filter((item) => item.id !== id);
    setPlaylist({ ...playlist, items: updatedItems });
    setHasChanges(true);
  };

  const handleDurationChange = (id, value) => {
    const items = playlist.items.map((item) =>
      item.id === id ? { ...item, duration: parseInt(value) || 0 } : item
    );
    setPlaylist({ ...playlist, items });
    setHasChanges(true);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setPlaylist((prev) => {
        const oldIndex = prev.items.findIndex((item) => item.id === active.id);
        const newIndex = prev.items.findIndex((item) => item.id === over.id);

        return {
          ...prev,
          items: arrayMove(prev.items, oldIndex, newIndex),
        };
      });
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    const updated = { ...playlist, updated: new Date().toISOString() };
    await window.electronAPI.savePlaylist(updated);
    toast.success('Playlist gespeichert');
    setHasChanges(false);
  };

  if (!playlist) return <div>Lade...</div>;

  return (
    <div className="container-fluid h-100 d-flex flex-column">

      <div className="d-flex align-items-center mb-4">

        <div className="me-5">
          <h1>{playlist.title} <small className="text-muted fs-4">Playlist</small></h1>
        </div>

        <div className="ms-auto">
          <button className="btn btn-outline-secondary me-2" onClick={onBack}>
            Zurück
          </button>
          <button
            className={`btn ${hasChanges ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Playlist speichern
          </button>
        </div>

      </div>

      <div className="row flex-fill overflow-hidden">

        {/* Left Column: Playlist Items */}
        <div className="col-md-6 d-flex flex-column h-100 overflow-auto">
          <h5 className="mb-3">Ablauf</h5>
          {playlist.items.length === 0 ? (
            <div className="alert alert-secondary text-center py-5">
              Die Playlist ist leer. <br />
              Füge Medien aus der rechten Spalte hinzu.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={playlist.items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="d-flex flex-column gap-2 mb-5">
                  {playlist.items.map((item) => (
                    <SortableItem
                      key={item.id}
                      id={item.id}
                      media={allMedia.find(m => m.id === item.id)}
                      duration={item.duration}
                      onRemove={handleRemove}
                      onDurationChange={handleDurationChange}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right Column: Media Library */}
        <div className="col-md-6 d-flex flex-column h-100">
          <h5 className="mb-3">Verfügbare Medien</h5>
          <div className="overflow-auto flex-fill">
            {allMedia.length === 0 && <p className="text-muted">Keine Medien hochgeladen.</p>}

            <div className="list-group">
              {allMedia.map(media => {
                const inPlaylist = playlist.items.some(i => i.id === media.id);
                return (
                  <button
                    key={media.id}
                    className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                    onClick={() => handleAdd(media)}
                  >
                    <div className="text-truncate me-2">
                      <div className="fw-bold text-truncate">{media.fileName}</div>
                      <small className="text-muted">{media.type} • {new Date(media.addedAt).toLocaleDateString()}</small>
                    </div>

                    {inPlaylist ? (
                      <span className="badge bg-secondary">Hinzugefügt</span>
                    ) : (
                      <BsPlusCircle className="text-primary fs-5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default EditPlaylistView;
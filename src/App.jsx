import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TorrentDetails from './components/TorrentDetails';
import AddTorrentModal from './components/AddTorrentModal';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [torrents, setTorrents] = useState([]);
  const [selectedHash, setSelectedHash] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    window.api.getAll().then(data => {
      setTorrents(data);
      if (data.length > 0) setSelectedHash(data[0].infoHash);
    });

    window.api.onUpdate(data => setTorrents(data));

    window.api.onAdded(t => {
      setTorrents(prev => {
        const exists = prev.find(x => x.infoHash === t.infoHash);
        return exists ? prev.map(x => x.infoHash === t.infoHash ? t : x) : [...prev, t];
      });
      setSelectedHash(t.infoHash);
    });

    window.api.onDone(t => showToast(`Finished: ${t.name}`));
    window.api.onError(msg => showToast(msg, 'error'));
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const filtered = torrents.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'active') return !t.done && !t.paused;
    if (filter === 'seeding') return t.done && !t.paused;
    if (filter === 'paused') return t.paused;
    return true;
  });

  const selected = torrents.find(t => t.infoHash === selectedHash) ?? null;

  async function handleAddFile() {
    try {
      const t = await window.api.addFile();
      if (t) setShowAdd(false);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function handleRemove(infoHash, deleteFiles) {
    await window.api.remove(infoHash, deleteFiles);
    setTorrents(prev => {
      const next = prev.filter(t => t.infoHash !== infoHash);
      if (selectedHash === infoHash) setSelectedHash(next[0]?.infoHash ?? null);
      return next;
    });
  }

  return (
    <div className="app">
      <TitleBar onSettings={() => setShowSettings(true)} />
      <div className="layout">
        <Sidebar
          torrents={filtered}
          selectedHash={selectedHash}
          filter={filter}
          counts={{
            all: torrents.length,
            active: torrents.filter(t => !t.done && !t.paused).length,
            seeding: torrents.filter(t => t.done && !t.paused).length,
            paused: torrents.filter(t => t.paused).length,
          }}
          onFilterChange={setFilter}
          onSelect={setSelectedHash}
          onAdd={() => setShowAdd(true)}
        />
        <TorrentDetails
          torrent={selected}
          onRemove={handleRemove}
          onPause={() => window.api.pause(selected?.infoHash)}
          onResume={() => window.api.resume(selected?.infoHash)}
        />
      </div>

      {showAdd && (
        <AddTorrentModal
          onAddFile={handleAddFile}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

function TitleBar({ onSettings }) {
  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <svg className="titlebar-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
        </svg>
        <span className="titlebar-name">Yumeko</span>
      </div>
      <div className="titlebar-controls">
        <button className="tb-btn settings-btn" onClick={onSettings} title="Settings">
          <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
          </svg>
        </button>
        <button className="tb-btn" onClick={() => window.api.windowMinimize()}>−</button>
        <button className="tb-btn" onClick={() => window.api.windowMaximize()}>□</button>
        <button className="tb-btn close" onClick={() => window.api.windowClose()}>✕</button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';

export default function SettingsModal({ onClose }) {
  const [downloadPath, setDownloadPath] = useState('');
  const [stopSeeding, setStopSeeding] = useState(false);

  useEffect(() => {
    window.api.getSettings().then(s => {
      setDownloadPath(s.downloadPath || '');
      setStopSeeding(s.stopSeedingWhenDone ?? false);
    });
  }, []);

  async function handleBrowse() {
    const newPath = await window.api.setDownloadPath();
    if (newPath) setDownloadPath(newPath);
  }

  async function handleStopSeedingToggle(e) {
    const val = e.target.checked;
    setStopSeeding(val);
    await window.api.saveSettings({ stopSeedingWhenDone: val });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <div className="setting-row">
            <div className="setting-info">
              <label className="setting-label">Default Save Path</label>
              <span className="setting-desc">New torrents will be downloaded to this folder</span>
            </div>
            <div className="setting-path-row">
              <span className="setting-path-value">{downloadPath || '—'}</span>
              <button className="action-btn" onClick={handleBrowse}>Browse…</button>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <label className="setting-label">Stop Seeding When Done</label>
              <span className="setting-desc">Automatically pause torrents after download completes</span>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={stopSeeding} onChange={handleStopSeedingToggle} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

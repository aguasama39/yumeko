import { useState } from 'react';
import { formatBytes, formatSpeed, formatTime, getStatus } from '../utils';

const STATUS_LABEL = {
  downloading: 'Downloading',
  seeding: 'Seeding',
  paused: 'Paused',
  connecting: 'Connecting',
};

export default function TorrentDetails({ torrent: t, onRemove, onPause, onResume, onSetSequential }) {
  const [tab, setTab] = useState('files');
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!t) {
    return (
      <div className="details-empty">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </div>
        <p>No torrent selected</p>
        <span>Add a torrent to get started</span>
      </div>
    );
  }

  const status = getStatus(t);
  const pct = Math.round(t.progress * 100);

  return (
    <div className="details">
      <div className="details-header">
        <div className="details-title-row">
          <h2 className="details-name" title={t.name}>{t.name}</h2>
          <div className="details-actions">
            {!t.done && (
              <button
                className={`action-btn${t.sequential ? ' sequential-active' : ''}`}
                onClick={() => onSetSequential(!t.sequential)}
                title="Download files in order from start to finish"
              >
                ⇣ Sequential
              </button>
            )}
            {t.paused
              ? <button className="action-btn" onClick={onResume}>▶ Resume</button>
              : <button className="action-btn" onClick={onPause}>⏸ Pause</button>
            }
            <button className="action-btn danger" onClick={() => setConfirmRemove(true)}>Remove</button>
          </div>
        </div>
        <span className={`status-badge ${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      <div className="details-progress-section">
        <div className="progress-bar-large">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-labels">
          <span className="progress-pct">{pct}%</span>
          <span className="progress-size">{formatBytes(t.downloaded)} / {formatBytes(t.length)}</span>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="↓" label="Download" value={formatSpeed(t.downloadSpeed)} accent />
        <StatCard icon="↑" label="Upload" value={formatSpeed(t.uploadSpeed)} />
        <StatCard icon="◎" label="Peers" value={t.numPeers} />
        <StatCard icon="⏱" label="ETA" value={formatTime(t.timeRemaining)} />
        <StatCard icon="◫" label="Size" value={formatBytes(t.length)} />
        <StatCard icon="⇌" label="Ratio" value={(t.ratio || 0).toFixed(2)} />
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'files' ? 'active' : ''}`} onClick={() => setTab('files')}>
          Files {t.files.length > 0 && <span className="tab-count">{t.files.length}</span>}
        </button>
        <button className={`tab-btn ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
          Info
        </button>
      </div>

      <div className="tab-content">
        {tab === 'files' && (
          <div className="files-list">
            {t.files.length === 0
              ? <p className="tab-empty">Fetching file list…</p>
              : t.files.map((f, i) => <FileRow key={i} file={f} />)
            }
          </div>
        )}

        {tab === 'info' && (
          <div className="info-list">
            <InfoRow label="Save Path" value={t.savePath || '—'} />
            <InfoRow label="Info Hash" value={t.infoHash} mono />
            <InfoRow label="Magnet" value={t.magnetURI ? t.magnetURI.slice(0, 80) + '…' : '—'} mono />
            <div className="info-folder-btn">
              <button className="action-btn" onClick={() => window.api.openFolder(t.savePath)}>
                Open Folder
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmRemove && (
        <div className="overlay" onClick={() => setConfirmRemove(false)}>
          <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Remove Torrent</h3>
            <p>Remove <strong>{t.name}</strong>?</p>
            <div className="confirm-actions">
              <button className="btn-danger" onClick={() => { onRemove(t.infoHash, true); setConfirmRemove(false); }}>
                Remove &amp; Delete Files
              </button>
              <button className="btn-secondary" onClick={() => { onRemove(t.infoHash, false); setConfirmRemove(false); }}>
                Remove Only
              </button>
              <button className="btn-ghost" onClick={() => setConfirmRemove(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className={`stat-card ${accent ? 'accent' : ''}`}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function FileRow({ file: f }) {
  const pct = Math.round((f.progress || 0) * 100);
  return (
    <div className="file-row">
      <div className="file-row-top">
        <span className="file-name">{f.name}</span>
        <div className="file-row-right">
          <span className="file-size">{formatBytes(f.length)}</span>
          <span className="file-pct">{pct}%</span>
          <button className="file-open-btn" onClick={() => window.api.openFile(f.path)} title="Open file">↗</button>
        </div>
      </div>
      <div className="file-bar">
        <div className="file-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className={`info-value ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  );
}

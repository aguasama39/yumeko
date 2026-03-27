import { formatSpeed, getStatus } from '../utils';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'seeding', label: 'Seeding' },
  { key: 'paused', label: 'Paused' },
];

export default function Sidebar({ torrents, selectedHash, filter, counts, onFilterChange, onSelect, onAdd }) {
  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="filter-tabs">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`filter-tab ${filter === f.key ? 'active' : ''}`}
              onClick={() => onFilterChange(f.key)}
            >
              {f.label}
              {counts[f.key] > 0 && <span className="filter-count">{counts[f.key]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="torrent-list">
        {torrents.length === 0 ? (
          <div className="sidebar-empty">
            <p>No torrents</p>
          </div>
        ) : (
          torrents.map(t => (
            <TorrentItem
              key={t.infoHash}
              torrent={t}
              selected={t.infoHash === selectedHash}
              onClick={() => onSelect(t.infoHash)}
            />
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button className="add-btn" onClick={onAdd}>
          <span>+</span> Add Torrent
        </button>
      </div>
    </div>
  );
}

function TorrentItem({ torrent: t, selected, onClick }) {
  const status = getStatus(t);
  const pct = Math.round(t.progress * 100);

  return (
    <div className={`torrent-item ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="torrent-item-header">
        <span className={`dot ${status}`} />
        <span className="torrent-item-name">{t.name}</span>
      </div>
      <div className="torrent-item-progress">
        <div className="mini-bar">
          <div className="mini-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="torrent-item-pct">{pct}%</span>
      </div>
      <div className="torrent-item-meta">
        {status === 'downloading' && (
          <>
            <span className="dl-speed">↓ {formatSpeed(t.downloadSpeed)}</span>
            <span className="ul-speed">↑ {formatSpeed(t.uploadSpeed)}</span>
          </>
        )}
        {status === 'seeding' && <span className="ul-speed">↑ {formatSpeed(t.uploadSpeed)}</span>}
        {status === 'paused' && <span className="status-label paused">Paused</span>}
        {status === 'connecting' && <span className="status-label connecting">Connecting…</span>}
      </div>
    </div>
  );
}

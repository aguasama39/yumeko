export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatSpeed(bps) {
  if (!bps || bps < 1) return '0 B/s';
  return formatBytes(bps) + '/s';
}

export function formatTime(ms) {
  if (!ms || ms === Infinity || ms < 0) return '∞';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export function getStatus(t) {
  if (t.paused) return 'paused';
  if (t.done) return 'seeding';
  if (t.progress === 0 && t.downloadSpeed === 0 && t.numPeers === 0) return 'connecting';
  return 'downloading';
}

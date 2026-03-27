const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAll: () => ipcRenderer.invoke('torrent:get-all'),
  addMagnet: (uri) => ipcRenderer.invoke('torrent:add-magnet', uri),
  addFile: () => ipcRenderer.invoke('torrent:add-file'),
  remove: (hash, del) => ipcRenderer.invoke('torrent:remove', hash, del),
  pause: (hash) => ipcRenderer.invoke('torrent:pause', hash),
  resume: (hash) => ipcRenderer.invoke('torrent:resume', hash),
  openFile: (p) => ipcRenderer.invoke('torrent:open-file', p),
  openFolder: (p) => ipcRenderer.invoke('torrent:open-folder', p),
  getSettings: () => ipcRenderer.invoke('torrent:get-settings'),
  saveSettings: (patch) => ipcRenderer.invoke('torrent:save-settings', patch),
  setDownloadPath: () => ipcRenderer.invoke('torrent:set-download-path'),
  onUpdate: (cb) => ipcRenderer.on('torrents:update', (_e, d) => cb(d)),
  onAdded: (cb) => ipcRenderer.on('torrent:added', (_e, d) => cb(d)),
  onDone: (cb) => ipcRenderer.on('torrent:done', (_e, d) => cb(d)),
  onError: (cb) => ipcRenderer.on('torrent:error', (_e, m) => cb(m)),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
});

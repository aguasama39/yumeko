const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

app.setAppUserModelId('com.torrent.app');

let mainWindow;
let client = null;
const clientReady = initClient();

// ── Persistence ───────────────────────────────────────────────────────────────

const dataFile = () => path.join(app.getPath('userData'), 'torrents.json');
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

// Cache of known metadata keyed by infoHash, used as fallback when a torrent
// is paused before WebTorrent has re-fetched its metadata (e.g. after restart).
const torrentCache = {};

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); }
  catch { return { downloadPath: app.getPath('downloads'), stopSeedingWhenDone: false }; }
}
function saveSettings(s) {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(s)); } catch {}
}
function loadSaved() {
  try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); }
  catch { return []; }
}
function saveTorrents() {
  if (!client) return;
  const data = client.torrents.map(t => {
    const cache = torrentCache[t.infoHash] || {};
    return {
      magnetURI: t.magnetURI,
      savePath: t.path,
      done: t.done || cache.done || false,
      paused: !!t.paused,
      // Persist metadata so it survives restart while paused
      progress: t.length > 0 ? t.progress : (cache.progress || 0),
      length: t.length || cache.length || 0,
      files: t.files && t.files.length > 0
        ? t.files.map(f => ({ name: f.name, path: f.path, length: f.length, progress: f.progress || 0 }))
        : (cache.files || []),
    };
  });
  try { fs.writeFileSync(dataFile(), JSON.stringify(data)); } catch {}
}

// ── WebTorrent ────────────────────────────────────────────────────────────────

function torrentToData(t) {
  const liveFiles = t.files && t.files.length > 0 ? t.files : null;
  const cache = torrentCache[t.infoHash] || {};

  // Update cache whenever we have real metadata from WebTorrent
  if (t.length > 0) {
    torrentCache[t.infoHash] = {
      progress: t.progress,
      length: t.length,
      done: t.done,
      files: (t.files || []).map(f => ({ name: f.name, path: f.path, length: f.length, progress: f.progress || 0 })),
    };
  }

  const length = t.length || cache.length || 0;
  const progress = t.length > 0 ? t.progress : (cache.progress || 0);
  const done = t.done || cache.done || false;
  const files = liveFiles
    ? liveFiles.map(f => ({ name: f.name, path: f.path, length: f.length, progress: f.progress || 0 }))
    : (cache.files || []);

  // Compute the folder that contains all this torrent's files
  const savePath = files.length > 0
    ? path.dirname(files[0].path)
    : (t.path || '');

  return {
    infoHash: t.infoHash,
    name: t.name || 'Fetching metadata...',
    magnetURI: t.magnetURI || '',
    progress,
    downloadSpeed: t.downloadSpeed || 0,
    uploadSpeed: t.uploadSpeed || 0,
    downloaded: t.downloaded || 0,
    uploaded: t.uploaded || 0,
    length,
    numPeers: t.numPeers || 0,
    done,
    paused: !!t.paused,
    timeRemaining: t.timeRemaining ?? Infinity,
    ratio: t.ratio || 0,
    savePath,
    files,
  };
}

// Ensures all torrent files are inside a named subfolder within downloadPath.
// For multi-file torrents WebTorrent already does this; this handles single-file torrents.
function ensureSubfolder(torrent, downloadPath) {
  if (!torrent.files || torrent.files.length === 0) return;
  const folderName = sanitizeName(torrent.name || torrent.infoHash);
  const targetDir = path.join(downloadPath, folderName);
  for (const file of torrent.files) {
    // If the file is directly in downloadPath (no subfolder), move it
    if (path.dirname(file.path) === downloadPath) {
      try {
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        const dest = path.join(targetDir, path.basename(file.path));
        if (fs.existsSync(file.path) && !fs.existsSync(dest)) {
          fs.renameSync(file.path, dest);
        }
      } catch {}
    }
  }
}

function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'torrent';
}

function setupTorrent(torrent) {
  torrent.on('done', () => {
    saveTorrents();
    if (mainWindow) mainWindow.webContents.send('torrent:done', torrentToData(torrent));
    if (Notification.isSupported()) {
      new Notification({
        title: 'Download Complete',
        body: torrent.name,
        icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
      }).show();
    }
    const settings = loadSettings();
    if (settings.stopSeedingWhenDone) {
      torrent.pause();
      for (const wire of [...torrent.wires]) wire.destroy();
    }
  });
}

async function initClient() {
  const settings = loadSettings();
  const { default: WebTorrent } = await import('webtorrent');
  client = new WebTorrent();

  client.on('error', err => {
    if (mainWindow) mainWindow.webContents.send('torrent:error', err.message);
  });

  for (const item of loadSaved()) {
    try {
      // Pre-populate cache from saved data using infoHash extracted from magnet URI
      if (item.magnetURI && (item.length || item.progress || (item.files && item.files.length))) {
        const match = item.magnetURI.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
        if (match) {
          torrentCache[match[1].toLowerCase()] = {
            progress: item.progress || 0,
            length: item.length || 0,
            done: item.done || false,
            files: item.files || [],
          };
        }
      }
      const t = client.add(item.magnetURI, { path: item.savePath || settings.downloadPath }, setupTorrent);
      t.pause();
    } catch {}
  }

  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('torrents:update', client.torrents.map(torrentToData));
    }
  }, 1000);
}

// ── Window ────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  await clientReady;
  createWindow();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 680,
    minWidth: 780, minHeight: 500,
    backgroundColor: '#0c0c0f',
    frame: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'dist-react', 'index.html'));
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── IPC ───────────────────────────────────────────────────────────────────────

ipcMain.handle('torrent:get-all', async () => {
  await clientReady;
  return client.torrents.map(torrentToData);
});

ipcMain.handle('torrent:add-magnet', async (_e, uri) => {
  await clientReady;
  const existing = client.get(uri);
  if (existing) return torrentToData(existing);
  const settings = loadSettings();
  return new Promise((resolve) => {
    const t = client.add(uri, { path: settings.downloadPath }, torrent => {
      ensureSubfolder(torrent, settings.downloadPath);
      setupTorrent(torrent);
      saveTorrents();
      if (mainWindow) mainWindow.webContents.send('torrent:added', torrentToData(torrent));
    });
    t.once('infoHash', () => {
      if (mainWindow) mainWindow.webContents.send('torrent:added', torrentToData(t));
      resolve(true);
    });
    t.once('close', () => resolve(false));
    t.on('error', err => {
      if (mainWindow) mainWindow.webContents.send('torrent:error', err.message);
    });
  });
});

ipcMain.handle('torrent:add-file', async () => {
  await clientReady;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open .torrent File',
    filters: [{ name: 'Torrent Files', extensions: ['torrent'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  const settings = loadSettings();
  const buf = fs.readFileSync(result.filePaths[0]);
  return new Promise((resolve, reject) => {
    const t = client.add(buf, { path: settings.downloadPath }, torrent => {
      ensureSubfolder(torrent, settings.downloadPath);
      setupTorrent(torrent);
      saveTorrents();
      if (mainWindow) mainWindow.webContents.send('torrent:added', torrentToData(torrent));
      resolve(torrentToData(torrent));
    });
    t.on('error', reject);
  });
});

ipcMain.handle('torrent:remove', async (_e, infoHash, deleteFiles) => {
  await clientReady;
  return new Promise(resolve => {
    client.remove(infoHash, { destroyStore: deleteFiles }, () => {
      saveTorrents();
      resolve();
    });
  });
});

ipcMain.handle('torrent:pause', async (_e, infoHash) => {
  await clientReady;
  const t = client.torrents.find(x => x.infoHash === infoHash);
  if (!t) return;
  t.pause();
  for (const wire of [...t.wires]) wire.destroy();
  if (mainWindow) mainWindow.webContents.send('torrents:update', client.torrents.map(torrentToData));
});

ipcMain.handle('torrent:resume', async (_e, infoHash) => {
  await clientReady;
  const t = client.torrents.find(x => x.infoHash === infoHash);
  if (!t) return;
  t.resume();
  if (mainWindow) mainWindow.webContents.send('torrents:update', client.torrents.map(torrentToData));
});


ipcMain.handle('torrent:open-file', (_e, filePath) => shell.openPath(filePath));
ipcMain.handle('torrent:open-folder', (_e, filePath) => shell.showItemInFolder(filePath));

ipcMain.handle('torrent:get-settings', () => loadSettings());
ipcMain.handle('torrent:save-settings', (_e, patch) => {
  const s = loadSettings();
  saveSettings({ ...s, ...patch });
});
ipcMain.handle('torrent:set-download-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Download Folder',
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  const s = loadSettings();
  s.downloadPath = result.filePaths[0];
  saveSettings(s);
  return result.filePaths[0];
});

ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.on('window-close', () => mainWindow.close());

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFile:   ()              => ipcRenderer.invoke('open-file'),
  analyse:    (source)        => ipcRenderer.invoke('analyse', { source }),
  aiGenerate: (prompt, key)   => ipcRenderer.invoke('ai-generate', { prompt, apiKey: key }),
  onMenuOpen: (cb) => ipcRenderer.on('menu-open', cb),
  onMenuRun:  (cb) => ipcRenderer.on('menu-run',  cb),
  onMenuAI:   (cb) => ipcRenderer.on('menu-ai',   cb),
});

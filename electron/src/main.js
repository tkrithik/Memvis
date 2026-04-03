const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path   = require('path');
const fs     = require('fs');
const https  = require('https');
const { execFileSync, execSync } = require('child_process');
const os     = require('os');

const isDev = !app.isPackaged;
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1300, height: 820,
    minWidth: 900, minHeight: 600,
    backgroundColor: '#0f1117',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: 'memvis',
      submenu: [
        {
          label: 'About memvis',
          click: () => dialog.showMessageBox(win, {
            type: 'none', title: 'About memvis', message: 'memvis',
            detail: [
              'C Memory Visualizer  —  Version 1.0.0',
              '',
              '© 2025 Krithik Tamilvanan. All rights reserved.',
              '',
              'Open-source components:',
              '  • Electron (MIT License)',
              '  • GCC / GNU Binutils (GPL v3)',
              '  • Geist Font by Vercel (SIL OFL)',
              '  • Claude API by Anthropic',
              '',
              'memvis is not affiliated with Apple Inc.',
            ].join('\n'),
            buttons: ['OK'],
          }),
        },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'Open C File…',      accelerator: 'Cmd+O', click: () => win.webContents.send('menu-open') },
        { label: 'Run Analysis',      accelerator: 'Cmd+R', click: () => win.webContents.send('menu-run')  },
        { label: 'Generate with AI…', accelerator: 'Cmd+G', click: () => win.webContents.send('menu-ai')  },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'Cmd+Shift+R' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

function backendDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '..', '..', 'backend');
}
function backendBin() { return path.join(backendDir(), 'memvis_backend'); }

function ensureBackend() {
  const bin = backendBin();
  if (fs.existsSync(bin)) return null;
  const src = path.join(backendDir(), 'memvis_backend.c');
  if (!fs.existsSync(src)) return `Backend source not found:\n${src}`;
  try {
    execSync(`gcc -O2 -o "${bin}" "${src}"`, { timeout: 30000 });
    return null;
  } catch (e) {
    return `Failed to compile backend:\n${e.message}\n\nInstall gcc:\n  macOS: xcode-select --install`;
  }
}

ipcMain.handle('open-file', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Open C Source File',
    filters: [{ name: 'C Source', extensions: ['c'] }],
    properties: ['openFile'],
  });
  if (r.canceled) return null;
  const p = r.filePaths[0];
  return { path: p, source: fs.readFileSync(p, 'utf8') };
});

ipcMain.handle('analyse', async (_e, { source }) => {
  const buildErr = ensureBackend();
  if (buildErr) return { error: buildErr };
  const tmp = path.join(os.tmpdir(), `memvis_src_${Date.now()}.c`);
  fs.writeFileSync(tmp, source);
  try {
    const out = execFileSync(backendBin(), [tmp], { timeout: 15000 }).toString();
    return JSON.parse(out);
  } catch (e) {
    if (e.stdout) { try { return JSON.parse(e.stdout.toString()); } catch (_) {} }
    return { error: e.message };
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
});

ipcMain.handle('ai-generate', async (_e, { prompt, apiKey }) => {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: `You are a C programming assistant for memvis, a memory visualizer.
Generate clean, self-contained C programs that compile with: gcc -g -O0
Rules:
- Include all needed headers
- Use globals, multiple functions, and local variables so the memory layout is interesting
- Keep programs under 70 lines
- End main() with return 0
- No C++ features
- Output ONLY the raw C source code, no markdown fences, no prose`,
      messages: [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try {
          const p = JSON.parse(raw);
          if (p.error) return resolve({ error: p.error.message || 'API error' });
          resolve({ code: p.content?.[0]?.text || '' });
        } catch { resolve({ error: 'Failed to parse API response' }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
});

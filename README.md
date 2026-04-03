# memvis

C memory visualizer. Shows the real address of every symbol (functions, globals, statics) plus the live process memory map — stack, heap, libc, and more.

## How it works

```
your .c file
    │
    ▼
backend/memvis_backend  (pure C, ~200 lines)
    ├── gcc -g -O0        compile the source
    ├── nm --defined-only  extract every symbol + address
    ├── fork() + SIGSTOP   run the binary, freeze it immediately
    ├── /proc/<pid>/maps   read live virtual memory layout
    └── JSON → stdout      emit everything structured

Electron reads that JSON and renders the UI.
```

## Requirements

| Tool | macOS | Linux |
|------|-------|-------|
| gcc  | `xcode-select --install` | `sudo apt install gcc` |
| nm   | included with Xcode CLT | `sudo apt install binutils` |
| Node ≥ 18 | https://nodejs.org | same |

## Run

```bash
# 1. Build the C backend (one time)
make

# 2. Install Electron and run
cd electron
npm install
npm start
```

## Build macOS .app

```bash
cd electron
npm run dist        # → dist/memvis-1.0.0-arm64.dmg
```

## Project structure

```
memvis/
├── Makefile
├── backend/
│   └── memvis_backend.c    ← the entire backend (one C file)
└── electron/
    ├── package.json
    └── src/
        ├── main.js         ← Electron main, spawns backend
        ├── preload.js      ← IPC bridge
        └── renderer/
            ├── index.html
            ├── style.css
            └── app.js
```

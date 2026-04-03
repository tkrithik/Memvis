# memvis

C Memory Visualizer — see where every variable and function lives in memory.

**Built by Krithik Tamilvanan · © 2025**

---

## What it does

Paste or open any `.c` file, click **Analyse**, and instantly see:
- The memory address of every function and global variable
- Which segment each symbol lives in (`.text`, `.data`, `.bss`, `.rodata`)
- A proportional address space map of your entire program
- Hover any address for an inline description of what it holds

## Requirements

- macOS (Ventura / Sonoma / Sequoia)
- Xcode Command Line Tools: `xcode-select --install`
- Node.js ≥ 18: https://nodejs.org

## Run
```bash
cd electron
npm install
npm start
```

## Build .app / DMG
```bash
cd electron
npm run dist   # → dist/memvis-1.0.0-arm64.dmg
```

## How it works

1. Your C source is compiled with `gcc -g -O0`
2. `nm --defined-only` reads every symbol and address from the binary
3. `size` reads segment sizes (`.text`, `.data`, `.bss`)
4. Results stream into the Electron UI as JSON

Addresses shown are **static** — captured before the program runs.
Stack locals and heap allocations require a live debugger (GDB).

## Project structure
```
memvis/
├── backend/
│   └── memvis_backend.c    ← entire backend, one C file
└── electron/
└── src/
├── main.js          ← Electron main process
├── preload.js       ← IPC security bridge
└── renderer/        ← HTML + CSS + JS frontend
```
## License

© 2025 Krithik Tamilvanan. All rights reserved.

Open-source components used: Electron (MIT), GCC/Binutils (GPL v3),
Geist Font (SIL OFL), Claude API (Anthropic ToS).

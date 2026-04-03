# App Store Submission Guide — memvis

**Developer:** Krithik Tamilvanan  
**Bundle ID:** com.krithiktamilvanan.memvis  
**Category:** Developer Tools

---

## Build steps

```bash
# 1. Install dependencies
cd electron && npm install

# 2. Generate .icns icon (macOS only)
bash scripts/make-icns.sh

# 3. Build for direct distribution (DMG)
npm run dist

# 4. Build for Mac App Store (MAS)
npm run dist:mas
```

## Before submitting to the App Store

### 1. Apple Developer Program
Enroll at developer.apple.com ($99/year). You need:
- A **Mac App Distribution** certificate
- A **Mac Installer Distribution** certificate
- An **App ID** matching `com.krithiktamilvanan.memvis`
- A **Provisioning Profile** for Mac App Store distribution

### 2. Code signing
electron-builder handles signing automatically if your certificates are in Keychain.
Set these environment variables before running `npm run dist:mas`:

```bash
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="your_cert_password"
export APPLE_ID="your@apple.id"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

### 3. App Store Connect
- Create a new app at appstoreconnect.apple.com
- Bundle ID: `com.krithiktamilvanan.memvis`
- Upload the `.pkg` from `dist/mas/` using Transporter or `xcrun altool`

### 4. App Store metadata
**Name:** memvis  
**Subtitle:** C Memory Visualizer  
**Description:**
> memvis shows you exactly where every variable and function in your C program lives in memory.
> 
> Open or paste a .c file, click Analyse, and instantly see:
> • The address of every global variable, function, and constant
> • Which segment each symbol lives in (.text, .data, .bss, .rodata)
> • A proportional address space map of your entire program
> • Hover any address for an inline description of what it holds
> 
> Built for CS students, embedded developers, and anyone learning how C programs are laid out in memory.

**Keywords:** C, memory, programming, developer tools, systems, debugger, address, pointer, stack, heap

**Age Rating:** 4+  
**Privacy:** No data collected. API keys are stored only in memory and never written to disk.

### 5. Known App Store sandbox constraints
The app calls `gcc` and `nm` as subprocesses. These are provided by Xcode Command Line Tools,
which are already on the user's Mac if they do any development. The app sandbox entitlements
include `com.apple.security.files.user-selected.read-write` for opening .c files.

If Apple rejects due to subprocess execution, the fallback is to distribute via direct DMG
(outside the App Store) using `npm run dist`.

---

## Copyright & Licenses

**memvis** © 2025 Krithik Tamilvanan. All rights reserved.

This application includes the following open-source components:

| Component | License | Source |
|-----------|---------|--------|
| Electron | MIT | github.com/electron/electron |
| GCC (used at runtime, not bundled) | GPL v3 | gcc.gnu.org |
| GNU Binutils nm/size (runtime) | GPL v3 | gnu.org/software/binutils |
| Geist Font | SIL Open Font License 1.1 | vercel.com/font |
| Claude API | Anthropic Terms of Service | anthropic.com |

Full license texts are available at the respective project URLs above.
The GPL v3 components (gcc, nm, size) are not bundled with this application;
they are invoked as system tools already present on the user's machine.

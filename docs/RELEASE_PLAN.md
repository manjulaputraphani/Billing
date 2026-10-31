# RELEASE PLAN — all environments (macOS / Windows / Android / Linux)

Status: **plan only, nothing built except macOS** (2026-11-01). Owner decision needed.

## Goal
From the same repo produce:
- macOS `.dmg` — DONE (signed? no)
- Windows `.exe` (NSIS) + `.msi`
- Android `.apk` (and optionally `.aab` for Play Store)
- Linux `.AppImage` / `.deb` (CI already configured)

## Current state

| Piece | Status |
|---|---|
| Tauri 2 desktop app | builds on macOS (`.app` + `.dmg`) |
| `.github/workflows/release.yml` | matrix: `windows-latest`, `macos-latest` (arm64+x64), `ubuntu-22.04` |
| Windows bundle | `windows.nsis` + `targets: "all"` → `.exe`/`.msi` on Windows |
| Android project | NOT initialised (`src-tauri/gen/` only has `schemas`) |
| Android icons | `src-tauri/icons/android/` exists |
| Secrets | Rust `keyring` crate — desktop only (no Android) |
| App identifier | `com.stocktracker.app` — `.app` suffix warning; change before release |
| UI | desktop UI is fixed min 1024 px (not phone-friendly); `web/` UI is responsive |
| GitHub remote | `https://github.com/manjulaputraphani/SDHHE.git` |

---

## Part 1 — Windows `.exe` (2–4 h, no rewrite)

1. Change `src-tauri/tauri.conf.json` identifier to `com.sdhhe.stocktracker`.
2. Commit + push.
3. Either push tag `v1.0.0` or run `release.yml` manually (`workflow_dispatch`).
4. Draft GitHub Release contains:
   - `Stock Tracker_1.0.0_x64-setup.exe` (NSIS)
   - `Stock Tracker_1.0.0_x64_en-US.msi`
   - macOS `.dmg`, Linux `.AppImage`/`.deb`.
5. Caveats: unsigned `.exe` → SmartScreen "Unknown publisher" (run via More info);
   build on Windows only (no cross-compile from macOS); app asks for the Neon URL
   on first run and stores it in Windows Credential Manager.

---

## Part 2 — Android `.apk` (choose one path)

The desktop UI is not phone-friendly and `keyring` has no Android support, so do NOT
port the desktop UI. Use the responsive web app.

### A. PWA only (4–6 h, no APK) — fastest
- Add `manifest.webmanifest`, icons, service worker (offline shell).
- Chrome → Install app / Add to Home Screen.
- Same origin → cookies + RBAC work; no new toolchain.
- Not a literal `.apk`.

### B. PWA + TWA APK (RECOMMENDED, 1–2 days)
- PWA from A, then Bubblewrap:
  `npx @bubblewrap/cli init --manifest https://sdhhe-api.blvphani.workers.dev/manifest.webmanifest`
- Real signed `.apk` + `.aab`; same origin so cookies/RBAC work unchanged.
- Needs a signing keystore + `/.well-known/assetlinks.json` on the worker.
- Google-Play-approved pattern; needs internet.

### C. Tauri Android shell around the hosted web app (2–3 days)
- `npx tauri android init` (Android Studio/SDK, NDK, JDK 17, Rust Android targets).
- WebView points at `https://sdhhe-api.blvphani.workers.dev` → same-origin cookies.
- `npx tauri android build --apk`.
- Thin wrapper; Play Store may reject as "minimum functionality"; no offline.

### D. Tauri Android with bundled web app + API (3–5 days)
- Bundle `web/dist`; `VITE_API_BASE=https://sdhhe-api.blvphani.workers.dev`.
- Worker changes: CORS + `SameSite=None; Secure` cookies (or token auth).
- App-like, still needs Android toolchain + signing. Use if offline is required.

### E. Port the desktop UI to Android (1–2 weeks, NOT recommended)
- Responsive rewrite + replace keyring with Stronghold/Keystore + plugin audit.

### Android toolchain (C/D; B needs Android SDK for Bubblewrap)
- Android Studio + SDK (API 34/35), NDK, JDK 17.
- Rust targets: `aarch64-linux-android`, `armv7-linux-androideabi`,
  `i686-linux-android`, `x86_64-linux-android`.
- Release keystore (`keytool -genkeypair …`) stored in GitHub Secrets.
- Output: `app-universal-release.apk` (sideload) and/or `app-release.aab` (Play).

---

## Part 3 — CI/CD plan (`release.yml`)

| Job | Runner | Output |
|---|---|---|
| build-windows | windows-latest | `.exe` + `.msi` (exists) |
| build-macos-arm64/x64 | macos-latest | `.dmg` (exists) |
| build-linux | ubuntu-22.04 | `.AppImage` + `.deb` (exists) |
| build-android (new) | ubuntu-latest + setup-android | `.apk`/`.aab` (only if C/D/E) |

Android CI steps: `actions/setup-java@v4` (Temurin 17) → `android-actions/setup-android@v3`
→ `rustup target add …` → `npm run tauri android build -- --apk` → upload artifact +
attach to draft release. Signing via GitHub Secrets.
TWA (B) CI is simpler: Bubblewrap job builds/signs APK/AAB and generates assetlinks.

---

## Effort / risk

| Deliverable | Effort | Risk |
|---|---|---|
| Windows `.exe`/`.msi` via CI | 2–4 h | Low (unsigned SmartScreen) |
| PWA | 4–6 h | Low |
| PWA + TWA APK (recommended) | 1–2 days | Low–medium (signing, asset links) |
| Tauri Android remote wrapper | 2–3 days | Medium (toolchain) |
| Tauri Android bundled + CORS | 3–5 days | Medium–high (cookies/CORS) |
| Desktop UI on Android | 1–2 weeks | High |

---

## Recommendation
1. Windows: fix identifier → tag `v1.0.0` → use `.exe`/`.msi` from the draft release.
2. Android: PWA first, then TWA APK (same origin, cookies/RBAC unchanged, Play-friendly).
3. Only do Tauri-Android-bundled (D) if offline is required.

## Decisions needed
1. Android: PWA+TWA (recommended) vs Tauri shell vs bundled offline app?
2. Distribution: sideload `.apk` only, or also Google Play (`.aab`)?
3. Windows signing: unsigned (SmartScreen warning) or buy a code-signing certificate?
4. Offline: must the phone app work without internet? (Yes → D; No → TWA enough.)

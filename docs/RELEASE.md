# Releasing Stock Tracker

Releases are built by GitHub Actions (`.github/workflows/release.yml`) for Windows, macOS
(Apple Silicon + Intel) and Linux. Tagging is what triggers a build.

## 1. Bump the version

The version lives in **three** places and they must match:

| File | Field |
|---|---|
| `package.json` | `"version"` |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version` under `[package]` |

```bash
# example: 1.0.0 -> 1.0.1
npm version 1.0.1 --no-git-tag-version
# then edit the two files by hand, or:
sed -i '' 's/"version": "1.0.0"/"version": "1.0.1"/' src-tauri/tauri.conf.json
sed -i '' 's/^version = "1.0.0"/version = "1.0.1"/' src-tauri/Cargo.toml
```

## 2. Check it locally

```bash
npm run typecheck
npm test
npm run test:db     # only if DATABASE_URL_TEST is set
```

## 3. Commit and tag

```bash
git add -A
git commit -m "release: v1.0.1"
git tag v1.0.1
git push origin HEAD
git push --tags
```

The tag push starts the release workflow. You can also run it by hand:
**Actions → release → Run workflow**.

## 4. Publish the draft

When the workflow finishes, GitHub has a **draft** release named `Stock Tracker v1.0.1`
with one installer per platform:

- Windows: `.exe` (NSIS, installs per-user, no admin) and `.msi`
- macOS: `.dmg` / `.app` for `aarch64` and `x86_64`
- Linux: `.deb`, `.rpm`, `.AppImage`

Open **Releases → the draft → Edit**, check the assets are attached, then **Publish release**.

## Notes

- The installer is **unsigned**. macOS Gatekeeper will block it on first launch
  (right-click → Open, or `xattr -dr com.apple.quarantine "/Applications/Stock Tracker.app"`).
  Windows SmartScreen shows "More info → Run anyway". Signing needs an Apple Developer ID and
  a Windows code-signing certificate; see the Tauri docs on code signing.
- `tauri.conf.json` sets `targets: ["nsis", "msi"]`, which are **Windows-only**. A `tauri build`
  on macOS/Linux produces no installer unless you pass `--bundles app` / `--bundles deb,appimage`.
  The CI covers every platform, so this only affects local builds.
- `npm test` in CI runs unit/UI tests only. `*.int.test.ts` and Playwright specs are excluded —
  they need a real database.

# MacroPulse iOS Builder

This repo builds the unsigned iOS `.ipa` for [MacroPulse-X](https://github.com/itszspikey-dotcom/MacroPulse-X)
(the actual app source, synced live from Google AI Studio).

## Why a separate repo?

AI Studio's "Stage and commit all changes" push does a **full mirror overwrite** of
MacroPulse-X's tree — anything committed there that AI Studio doesn't recognize as its
own (a CI workflow, Capacitor config, patched source files) gets silently deleted on
the next sync. So none of the mobile-build machinery can live inside MacroPulse-X.

Instead, this repo owns all of that, and never writes to MacroPulse-X:

1. `.github/workflows/build-ipa.yml` polls MacroPulse-X's latest commit on a cron
   (every ~15 min, cheap `ubuntu-latest` runner).
2. When it changes, a `macos-latest` job clones MacroPulse-X fresh into a throwaway
   workspace and layers `patches/` on top of that clone — never committed back.
3. Builds, archives unsigned, and publishes to this repo's `latest` GitHub Release.
4. `apps.json` here is the AltStore/Feather source manifest pointing at that release —
   add `https://raw.githubusercontent.com/itszspikey-dotcom/macropulse-ios/main/apps.json`
   as a source in Feather to always get the current build.

## `patches/`

- `geminiClient.ts` — calls Gemini directly from the client (no bundled backend exists
  in the native build).
- `geminiFetchShim.ts` — intercepts MacroPulse-X's `fetch('/api/ai/...')` calls and
  routes them through `geminiClient.ts`, injected via one prepended import line in
  `main.tsx`. Deliberately doesn't touch component internals, since those have already
  changed shape once and would need re-patching on every AI Studio edit otherwise. If
  the request/response contract for those two endpoints changes, the existing
  local-fallback code in each modal keeps the app from crashing — AI features just
  silently degrade to fallback data until this shim is updated to match.

- `extra-deps.txt` — packages MacroPulse-X's source imports but doesn't declare in
  `package.json` (AI Studio's generated commits have missed this before — `firebase`
  was the first case). One package name per line; installed before `npm run build`
  regardless of what's in the cloned `package.json`. If a build fails with a Rollup
  "failed to resolve import" error, check whether the missing package needs adding
  here.

## Required secret

`VITE_GEMINI_API_KEY` (repo Settings → Secrets and variables → Actions) — baked into
the client bundle at build time, since the native app calls Gemini directly.

## Local re-check

To see what actually changed on MacroPulse-X before the next scheduled poll, just
run the workflow manually via **Actions → Run workflow**.

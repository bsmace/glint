# Glint — Browser Extension Prompt Assistant

## Stack
- **WXT** framework + **Preact** (not React — `@preact/preset-vite`, `jsxImportSource: "preact"`)
- TypeScript, Vite, pnpm
- Chrome Prompt API (`LanguageModel.create`) for on-device AI; heuristic string fallback
- Dexie (IndexedDB) for storage; `@floating-ui/dom` for positioning

## Commands
| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server (chrome) |
| `pnpm dev:firefox` | Dev server (firefox) |
| `pnpm build` | Production build |
| `pnpm zip` | Create `.output/*.zip` for store submission |
| `pnpm postinstall` | Regenerates `.wxt/` types (runs `wxt prepare`) |
| `npx wxt prepare && npx tsc --noEmit -p tsconfig.json` | Full typecheck (prepare first, it generates `.wxt/tsconfig.json`) |
| `node scripts/screenshots.mjs` | Generate store screenshots (writes `.output/chip-demo.html` then screenshots via Playwright headless) |

## Architecture
- **3 entrypoints:** `content.tsx` (ISOLATED world, matches 6 sites), `background.ts` (Dexie CRUD+telemetry only), `sidepanel/` (memory/variables/prompts UI)
- **AI is content-side only** — `LanguageModel.create()` runs in ISOLATED content script. Background has NO AI router, NO fetch to external APIs.
- Messaging: discriminated union via `chrome.runtime.sendMessage` (`shared/messaging.ts`), typed as `BackgroundRequest`/`BackgroundResponse`.
- **4 chip actions** (`shared/ai.ts`): `improve | concise | addContext | format` — no Expand chip. Type in `shared/ai.ts`, implementations in `content/ai.ts`.
- All styling is **inline** (no CSS files/classes).
- Permissions: only `storage` + `sidePanel` — no `host_permissions`.

## Key conventions
- ISOLATED world, `runAt: document_idle`, Shadow DOM `mode: 'closed'` with `adoptedStyleSheets` (`all: initial`).
- Inline styles throughout (Preact via JS objects, no CSS files).
- SPA re-attach: `MutationObserver` on `document.body` detects anchor removal; `MutationObserver` on `document` detects URL change.
- Telemetry flushes to background every 60s via `setInterval`.
- `.output` gitignored (`pnpm zip` and Playwright output goes there).
- `pnpm-workspace.yaml` allows `esbuild` and `spawn-sync` builds.
- Path alias `@/*` maps to `entrypoints/*`.

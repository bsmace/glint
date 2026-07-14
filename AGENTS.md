# Glint — Browser Extension Prompt Assistant

## Stack
- **WXT** framework + **React 19** (`@wxt-dev/module-react` in `wxt.config.ts`, ReactDOM `createRoot`)
- **shadcn/ui** (base-nova theme via `@base-ui/react`) + **framer-motion** for polished UI
- **Tailwind CSS v4** (`@tailwindcss/postcss`) — dark-only theme with OKLCH tokens
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
- Permissions: only `storage` + `sidePanel` — no `host_permissions`.

## Key conventions
- ISOLATED world, `runAt: document_idle`, Shadow DOM `mode: 'closed'` with `adoptedStyleSheets` + CSS injected via `?inline` import (`CSSStyleSheet.replaceSync`).
- **No CSS files/classes in content script** — all styling via `styles/tailwind.css` injected into Shadow DOM + inline Tailwind classes on React components.
- Content script uses ReactDOM `createRoot`, manual shadow host insertion, and `forwardRef` for floating UI positioning.
- Sidepanel uses React + shadcn directly (no Shadow DOM), imports `@/styles/tailwind.css` normally.
- **shadcn theme:** base-nova dark-only in `styles/tailwind.css` with OKLCH tokens (`--color-background: oklch(0.145 0 0)`, `--color-foreground: oklch(0.985 0 0)`). Utility classes: `glint-shadow`, `scrollbar-none`, `fade-bottom`, `glint-draw`.
- **framer-motion** for animated transitions (chip bar slide/morph, tab content cross-fade).
- SPA re-attach: `MutationObserver` on `document.body` detects anchor removal; `MutationObserver` on `document` detects URL change.
- Telemetry flushes to background every 60s via `setInterval`.
- `.output` gitignored (`pnpm zip` and Playwright output goes there).
- `pnpm-workspace.yaml` allows `esbuild` and `spawn-sync` builds.
- Path alias `@/*` maps to project root (configured in `wxt.config.ts` `alias: { '@': '.' }`, generated in `.wxt/tsconfig.json`).
- shadcn components in `components/ui/`, Tailwind base in `styles/tailwind.css`, utilities in `lib/utils.ts`.
- `components.json` configures `@src/styles` for CSS — but actual path is root `styles/tailwind.css`.

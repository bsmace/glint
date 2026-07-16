# Glint - Project Roadmap

> **Vision**: Build Glint, an "invisible" browser intelligence layer that attaches to AI chat inputs. Faster and more robust than competitors (MetaPrompt/Promptly) using native browser APIs and a site-agnostic detection engine.

---

## Development Phases

### Phase 1: Foundation & Registry ✅

**Status**: COMPLETE

#### Completed Items:
- [x] `vite.config.ts` - CRXJS plugin configuration with MV3 manifest
  - Browser: Chrome
  - Build target: esnext
  - Entry points: background, content, worker
  - Orama excluded from optimizeDeps
  
- [x] `src/manifest.ts` - Manifest V3 configuration
  - Permissions: `ai`, `storage`, `activeTab`, `scripting`
  - Host permissions: ChatGPT, Claude, Gemini
  - Content scripts with `run_at: document_idle`
  
- [x] `src/core/engine/DetectionManager.ts` - Strategy Pattern implementation
  - `AriaTextboxStrategy` - Detects `role="textbox"` elements
  - `ContentEditableStrategy` - Detects contenteditable elements
  - `TextareaStrategy` - Detects textarea elements
  - MutationObserver for dynamic detection
  - Confidence scoring system
  - Caching mechanism
  
- [x] Environment setup
  - `.env`: `VITE_AI_STRATEGY=window_ai_2026`
  - Framework: Preact + Signals
  - Styling: Tailwind 4 (JIT-in-JS)
  - Positioning: CSS Anchor Positioning
  - Animations: View Transitions API

#### Missing Items:
- [ ] Site-specific adapters in `src/adapters/sites/` (directory exists but empty)
  - [ ] ChatGPT adapter
  - [ ] Claude adapter
  - [ ] Gemini adapter

---

### Phase 2: The Logic Kernel ✅

**Status**: COMPLETE

#### Completed Items:
- [x] `src/core/worker/aiWorker.ts` - SharedWorker for off-main-thread logic
  - Comlink RPC exposure
  - Orama vector database initialization
  - Prompt history storage and retrieval
  
- [x] `src/core/worker/index.ts` - Worker entry point (exists but empty)

- [x] `src/lib/ai/workerBridge.ts` - Comlink wrapper for main thread communication
  - Type-safe RPC interface
  - Connection management
  - Auto-reconnection logic

- [x] `src/lib/ai/schema.ts` - Zod validation schemas
  - `AIResponseSchema` - Validates AI outputs
  - `PromptHistoryItemSchema` - History items
  - `DetectionResultSchema` - Detection results
  - `RemoteAdapterConfigSchema` - Remote config validation
  - `validateCharacterCount()` utility

- [x] AI Orchestrator features
  - Native `window.ai.rewriter` API wrapper
  - Filler phrase stripping ("Here is your prompt:", etc.)
  - Four improvement modes: improve, concise, context, format

#### Missing Items:
- [ ] Error handling for invalid AI responses (Retry state UI)
- [ ] Database persistence across sessions

---

### Phase 3: The Holographic UI ✅

**Status**: COMPLETE

#### Completed Items:
- [x] `src/ui/overlay/GlintBar.tsx` - Main UI component using Preact Signals
  - Closed Shadow DOM container
  - CSS Anchor Positioning (`anchor-name: --glint-anchor`)
  - Popover API (`popover="manual"`) for top-layer isolation
  - Four core chips: ✨ Improve, 📝 Concise, 🎯 Context, 📋 Format
  - Accept/Undo chips for non-destructive editing
  - Live character counter with red highlight at 2,500 chars
  - Privacy badge ("On-device")
  - View Transition API for smooth text morphing
  
- [x] `src/ui/styles/holographic.ts` - Glassmorphism styling
  - `backdrop-filter: blur(20px) saturate(180%)`
  - 0.5px white/10% border
  - Inter font family
  - Chip hover states and animations
  - Character counter warning/error states
  - Reduced motion support
  - High contrast mode support

- [x] Signal-based state management
  - `isVisible`, `isProcessing`, `activeMode`
  - `characterCount`, `originalText`, `improvedText`
  - `pendingChange` for undo functionality

#### Missing Items:
- [ ] Scroll anchoring verification (bar "sticks" during scrolling)
- [ ] Focus management for accessibility

---

### Phase 4: Resilience & Polish ✅

**Status**: COMPLETE

#### Completed Items:
- [x] `src/adapters/remoteAdapter.ts` - Remote Adapter for dynamic updates
  - Fetches JSON config from URL
  - 5-minute fetch interval
  - Falls back to default selectors
  - Site selector overrides without extension update
  - Default adapters for ChatGPT, Claude, Gemini

- [x] Privacy Badge in GlintBar confirming on-device processing

- [x] `src/content.ts` - Content script entry point
  - Detection loop with `requestAnimationFrame`
  - SPA navigation handling via MutationObserver
  - Remote adapter initialization

- [x] `src/background.ts` - Background service worker
  - Extension lifecycle handling
  - Message handling from content scripts
  - Keep-alive alarms

#### Missing Items:
- [ ] Icon assets (`public/icons/`)
- [ ] End-to-end testing

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Extension                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │  Content Script  │    │   Background Service Worker  │   │
│  │  (Main Thread)   │    │                              │   │
│  │                  │    │  - Lifecycle management      │   │
│  │  ┌────────────┐  │    │  - Message routing           │   │
│  │  │ Detection  │  │◄───┤                              │   │
│  │  │ Manager    │  │    └──────────────────────────────┘   │
│  │  └────────────┘  │                                       │
│  │         │        │    ┌──────────────────────────────┐   │
│  │         ▼        │    │     SharedWorker (Off-Main)  │   │
│  │  ┌────────────┐  │    │                              │   │
│  │  │  GlintBar  │  │    │  ┌────────────────────────┐  │   │
│  │  │  (Shadow   │  │    │  │   AI Orchestrator      │  │   │
│  │  │   DOM)     │──┼────┼──│   - window.ai wrapper  │  │   │
│  │  └────────────┘  │    │  │   - Filler stripping   │  │   │
│  │         │        │    │  │                        │  │   │
│  │         │        │    │  │  ┌──────────────────┐  │  │   │
│  │         │        │    │  │  │ Orama Vector DB  │  │  │   │
│  │         │        │    │  │  │ - Prompt history │  │  │   │
│  │         │        │    │  │  └──────────────────┘  │  │   │
│  │         │        │    │  └────────────────────────┘  │   │
│  │         │        │    │            ▲                 │   │
│  │         │        │    │            │ Comlink RPC     │   │
│  └─────────┼────────┘    └────────────┼─────────────────┘   │
│            │                          │                      │
└────────────┼──────────────────────────┼──────────────────────┘
             │                          │
             ▼                          ▼
    ┌─────────────────┐    ┌─────────────────────────┐
    │  Web Page DOM   │    │  Native window.ai API   │
    │  - ARIA roles   │    │  - Rewriter endpoint    │
    │  - contentedit  │    │  - On-device processing │
    └─────────────────┘    └─────────────────────────┘
```

---

## File Structure

```
/workspace
├── .env                          # Environment config
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts               # ✅ CRXJS + MV3 setup
├── public/
│   ├── assets/
│   └── icons/                   # ❌ MISSING: icon files
├── src/
│   ├── manifest.ts              # ✅ Manifest V3 config
│   ├── background.ts            # ✅ Service worker
│   ├── content.ts               # ✅ Content script entry
│   ├── core/
│   │   ├── engine/
│   │   │   └── DetectionManager.ts  # ✅ Strategy pattern
│   │   └── worker/
│   │       ├── aiWorker.ts      # ✅ SharedWorker logic
│   │       └── index.ts         # ⚠️ Empty file
│   ├── lib/
│   │   └── ai/
│   │       ├── schema.ts        # ✅ Zod validation
│   │       └── workerBridge.ts  # ✅ Comlink wrapper
│   ├── ui/
│   │   ├── overlay/
│   │   │   └── GlintBar.tsx     # ✅ Holographic UI
│   │   └── styles/
│   │       └── holographic.ts   # ✅ Glassmorphism CSS
│   └── adapters/
│       ├── remoteAdapter.ts     # ✅ Remote config fetcher
│       └── sites/               # ❌ EMPTY: Site adapters needed
```

---

## Next Steps / TODOs

### High Priority
1. **Create icon assets** - Generate 16x16, 48x48, 128x128 PNG icons in `public/icons/`
2. **Implement site adapters** - Add specific detection logic for ChatGPT, Claude, Gemini in `src/adapters/sites/`
3. **Add Retry state UI** - Show retry option when AI output validation fails
4. **Test scroll anchoring** - Verify CSS Anchor Positioning works during page scroll

### Medium Priority
5. **Database persistence** - Save/load Orama state from chrome.storage
6. **Accessibility improvements** - Add proper focus management and ARIA labels
7. **Error boundaries** - Graceful degradation when window.ai is unavailable

### Low Priority
8. **Performance metrics** - Add FPS monitoring to verify 120Hz main thread
9. **Analytics** - Anonymous usage stats (opt-in)
10. **Theme customization** - Allow users to adjust glassmorphism intensity

---

## Technical Debt

- `glintBarIsAttached()` in content.ts returns `false` always - needs proper implementation
- `src/core/worker/index.ts` is empty - should export worker API types
- No unit tests for DetectionManager strategies
- No E2E tests for full prompt improvement flow

---

## Dependencies Status

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| preact | ^10.29.7 | UI framework | ✅ Installed |
| @preact/signals-core | ^1.14.4 | State management | ✅ Installed |
| comlink | ^4.4.2 | Worker RPC | ✅ Installed |
| @orama/orama | ^3.1.18 | Vector search | ✅ Installed |
| zod | ^4.4.3 | Schema validation | ✅ Installed |
| @crxjs/vite-plugin | ^2.7.1 | CRX build tool | ✅ Installed |
| tailwindcss | ^4.0.0 | Styling | ✅ Installed |
| typescript | ^5.9.3 | Type safety | ✅ Installed |
| vite | ^6.4.3 | Build tool | ✅ Installed |

---

*Last updated: 2026-07-16*

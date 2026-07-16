# Glint - Agent Session Memory

> **Purpose**: This file serves as "Session Memory" for continuity between development sessions. It tracks what was built, why decisions were made, and where the next session should start.

---

## Current Context (Last Updated: 2026-07-16)

### What Was Just Built

**Phase 1-4 Core Implementation: COMPLETE**

All four phases of the initial roadmap have been implemented:

1. **Foundation & Registry** ✅
   - Vite + CRXJS build configuration
   - Manifest V3 setup with `ai` permission
   - DetectionManager with Strategy Pattern (AriaTextboxStrategy, ContentEditableStrategy, TextareaStrategy)
   - Preact Signals for state management
   - CSS Anchor Positioning for UI placement

2. **Logic Kernel** ✅
   - SharedWorker (`aiWorker.ts`) with Comlink RPC
   - Orama vector database for prompt history
   - WorkerBridge for type-safe main-thread communication
   - Zod schemas for all AI data validation

3. **Holographic UI** ✅
   - GlintBar component in closed Shadow DOM
   - Glassmorphism styling with backdrop-filter
   - Four action chips: Improve, Concise, Context, Format
   - Accept/Undo workflow with View Transitions
   - Live character counter with limit warnings
   - Popover API for top-layer isolation

4. **Resilience & Polish** ✅
   - RemoteAdapter for dynamic config updates
   - Site-specific adapters (ChatGPT, Claude, Gemini)
   - Background service worker lifecycle management
   - SPA navigation handling via MutationObserver

### Current File Structure

```
/workspace
├── ROADMAP.md                    # ✅ Comprehensive project roadmap
├── package.json                  # ✅ Dependencies configured
├── tsconfig.json                 # ✅ TypeScript config
├── vite.config.ts                # ✅ CRXJS + MV3 setup
├── src/
│   ├── manifest.ts               # ✅ Manifest config
│   ├── background.ts             # ✅ Service worker
│   ├── content.ts                # ✅ Content script entry
│   ├── core/
│   │   ├── engine/
│   │   │   └── DetectionManager.ts  # ✅ Strategy pattern
│   │   └── worker/
│   │       ├── aiWorker.ts       # ✅ SharedWorker logic
│   │       └── index.ts          # ⚠️ EMPTY - needs exports
│   ├── lib/ai/
│   │   ├── schema.ts             # ✅ Zod validation
│   │   └── workerBridge.ts       # ✅ Comlink wrapper
│   ├── ui/
│   │   ├── overlay/
│   │   │   └── GlintBar.tsx      # ✅ Holographic UI
│   │   └── styles/
│   │       └── holographic.ts    # ✅ Glassmorphism CSS
│   └── adapters/
│       ├── remoteAdapter.ts      # ✅ Remote config
│       └── sites/
│           ├── index.ts          # ✅ Exports
│           ├── chatgpt.ts        # ✅ ChatGPT adapter
│           ├── claude.ts         # ✅ Claude adapter
│           └── gemini.ts         # ✅ Gemini adapter
└── public/
    ├── assets/
    └── icons/                    # ❌ MISSING - icon files needed
```

---

## Technical Decisions Log

### Decision: Strategy Pattern for Detection Engine
**Date**: 2026-07-16  
**Why**: Site-agnostic detection requires extensibility. New AI chat sites emerge frequently; we need to add site-specific strategies without modifying core logic.  
**Alternative Considered**: Single monolithic detector with many if-statements.  
**Rejected Because**: Hard to test, violates Open/Closed Principle, becomes unmaintainable.  
**Implementation**: `DetectionStrategy` interface with `name` and `detect()` method. Strategies registered at runtime based on hostname.

### Decision: Closed Shadow DOM for GlintBar
**Date**: 2026-07-16  
**Why**: Complete style isolation from host page. Prevents CSS conflicts and ensures consistent appearance across all sites.  
**Alternative Considered**: Open Shadow DOM or iframe.  
**Rejected Because**: Open Shadow DOM allows page CSS leakage; iframe has positioning and communication overhead.  
**Implementation**: `attachShadow({ mode: 'closed' })` with all styles injected programmatically.

### Decision: CSS Anchor Positioning + Popover API
**Date**: 2026-07-16  
**Why**: Native browser APIs eliminate JavaScript layout calculations. Bar automatically follows input during scroll/resize. Zero reflow cost.  
**Alternative Considered**: Manual div with absolute positioning + scroll listeners.  
**Rejected Because**: Performance overhead, race conditions, battery drain from continuous listening.  
**Implementation**: `anchor-name: --glint-anchor` on input, `position-anchor: --glint-anchor` on bar. `popover="manual"` for top-layer isolation.

### Decision: Preact Signals over React Hooks
**Date**: 2026-07-16  
**Why**: Fine-grained reactivity without re-renders. Signals update only affected DOM nodes. Critical for maintaining 120Hz main thread.  
**Alternative Considered**: React with useState/useEffect.  
**Rejected Because**: React re-renders entire component tree on state changes; Signals update individual text nodes.  
**Implementation**: `signal()` from `@preact/signals-core`, read via `.value` in render functions.

### Decision: Zod for All AI Data Parsing
**Date**: 2026-07-16  
**Why**: Runtime type safety prevents "[object Object]" bugs when AI returns unexpected structures. Clear error messages for debugging.  
**Alternative Considered**: TypeScript interfaces only or manual type guards.  
**Rejected Because**: TS types erased at runtime; manual guards are verbose and error-prone.  
**Implementation**: Schemas in `src/lib/ai/schema.ts`, validated before any DOM manipulation.

### Decision: SharedWorker vs Web Worker
**Date**: 2026-07-16  
**Why**: SharedWorker persists across tabs. Prompt history shared between multiple ChatGPT tabs. Single Orama instance saves memory.  
**Alternative Considered**: Standard Web Worker per tab.  
**Rejected Because**: Duplicate databases, no cross-tab history, higher memory footprint.  
**Implementation**: `new SharedWorker('./aiWorker.ts', { type: 'module' })` with Comlink port exposure.

### Decision: window.ai API (July 2026 Spec)
**Date**: 2026-07-16  
**Why**: Native browser AI is on-device, privacy-preserving, and zero-latency. No API keys or rate limits.  
**Alternative Considered**: External AI service calls (OpenAI/Anthropic APIs).  
**Rejected Because**: Privacy concerns, latency, cost, requires user API keys.  
**Implementation**: `window.ai.rewriter.rewrite(text, { mode })` with filler phrase stripping.

### Decision: RemoteAdapter for Dynamic Config
**Date**: 2026-07-16  
**Why**: Site selectors change without notice. Remote config allows fixes without extension update/review cycle.  
**Alternative Considered**: Hard-coded selectors in extension code.  
**Rejected Because**: 1-3 day Chrome Web Store review delays critical fixes.  
**Implementation**: Fetches JSON config every 5 minutes, falls back to defaults if fetch fails.

---

## Known Issues & Technical Debt

| Issue | Severity | Location | Notes |
|-------|----------|----------|-------|
| `src/core/worker/index.ts` is empty | Low | Worker entry | Should export type definitions and worker API surface |
| No icon assets | Medium | `public/icons/` | Need 16x16, 48x48, 128x128 PNG files for manifest |
| `glintBarIsAttached()` was returning false always | Fixed | `content.ts` | Now delegates to `glintBar.isAttached()` |
| No unit tests | High | Entire codebase | Need Jest/Vitest tests for DetectionManager strategies |
| No E2E tests | High | Entire flow | Need Playwright tests for full prompt improvement cycle |
| Database not persistent | Medium | `aiWorker.ts` | Orama state lost on worker termination |
| No retry UI state | Medium | `GlintBar.tsx` | Need UI for handling AI validation failures |

---

## Handoff Instructions for Next Session

### Starting Point
The next session should begin with **Issue #001: Core Detection Engine Verification** or pick the highest priority item from the TODO list below.

### Immediate Next Steps (Priority Order)

1. **Create issues/*.md files** - Document individual tasks with Problem/Solution/DoD format
2. **Add unit tests** - Test each DetectionStrategy independently
3. **Implement retry UI** - Add visual feedback when AI response validation fails
4. **Generate icon assets** - Create PNG icons for manifest
5. **Database persistence** - Save/load Orama state from chrome.storage.local
6. **Accessibility audit** - Verify ARIA labels, focus management, keyboard navigation

### Commands to Resume Development

```bash
# Check current build status
npm run build

# Run tests (once implemented)
npm test

# Type check
npx tsc --noEmit
```

### Environment Variables
```
VITE_AI_STRATEGY=window_ai_2026
VITE_REMOTE_CONFIG_URL=https://example.com/glint-config.json (optional)
```

---

## Session History

### Session 1: Initial Setup (2026-07-16)
- Created project structure
- Implemented all 4 phases
- Set up build pipeline with Vite + CRXJS
- Wrote DetectionManager with Strategy Pattern
- Built GlintBar UI with Preact Signals
- Configured SharedWorker with Comlink
- Added Zod validation schemas
- Created site adapters for ChatGPT/Claude/Gemini

### Session 2: Documentation & Continuity (Current)
- Creating AGENTS.md for session memory
- Auditing existing code against roadmap
- Creating issues/*.md tracking system
- Verifying implementation matches specifications

---

*Last updated: 2026-07-16*  
*Next session should reference this file before starting work*

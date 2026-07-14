# Comprehensive Glint Improvement Plan

## Priority Levels
- P0: Critical, fix immediately
- P1: High, fix soon
- P2: Medium, nice to have
- P3: Low, future improvement

---

## 1. Architecture & Code Structure

### 1.1 Type Duplication & Centralization (P1)
- **Issue**: `MemoryEntry`, `Variable`, `SavedPrompt` types are defined in both `shared/db.ts` and `entrypoints/sidepanel/App.tsx`
- **Root Cause**: No central type exports from shared modules
- **Recommended Fix**: Export all shared types from `shared/db.ts`, import them in other files instead of redefining
- **Files to Modify**: `shared/db.ts`, `entrypoints/sidepanel/App.tsx`

### 1.2 Monolithic Content Script (P1)
- **Issue**: `entrypoints/content.tsx` is 200+ lines with mixed concerns: AI init, detector, UI mounting, telemetry
- **Root Cause**: No modularization of content script components
- **Recommended Fix**: Split into modules:
  - `content/telemetry.ts`: Telemetry handling
  - `content/mounting.ts`: Shadow DOM mounting/unmounting
  - `content/substitute-variables.ts`: Variable substitution logic
  - `content/index.ts`: Main entry point
- **Files to Modify/Create**: Split `content.tsx` into multiple files

### 1.3 Global Telemetry in Background (P0)
- **Issue**: `telemetry` variable is a top-level module var in `background.ts`—if background service worker restarts, telemetry is lost
- **Root Cause**: Not persisting telemetry in IndexedDB
- **Recommended Fix**: Add telemetry table to Dexie DB, persist telemetry data
- **Files to Modify**: `shared/db.ts`, `shared/services.ts`, `entrypoints/background.ts`

### 1.4 Unused ErrorBoundary (P1)
- **Issue**: `components/ErrorBoundary.tsx` exists but is not used in side panel or content script
- **Root Cause**: Forgot to wrap components
- **Recommended Fix**: Wrap App.tsx in ErrorBoundary; consider using in content script
- **Files to Modify**: `entrypoints/sidepanel/main.tsx`, `entrypoints/sidepanel/App.tsx`

---

## 2. Code Quality

### 2.1 Magic Numbers (P2)
- **Issue**: Hardcoded numbers like 60000ms, 2000ms, 30000ms, 150ms scattered across files
- **Root Cause**: No constants file
- **Recommended Fix**: Create `shared/constants.ts` with named constants
- **Files to Modify**: Create `shared/constants.ts`, update references in:
  - `entrypoints/content.tsx`
  - `entrypoints/content/detector.ts`
  - `entrypoints/content/ai.ts`

### 2.2 `any` Types (P1)
- **Issue**: `(globalThis as any).LanguageModel`, `r.data as Variable[]`, etc.
- **Root Cause**: No proper type definitions
- **Recommended Fix**:
  - Create `types/language-model.d.ts` for `globalThis.LanguageModel`
  - Create type guards for `BackgroundResponse` data
- **Files to Modify/Create**:
  - Create `types/language-model.d.ts`
  - Update `shared/messaging.ts` to add type guards
  - Update all usages to use type guards instead of casts

### 2.3 DetectResult Strategy Type Inconsistency (P0)
- **Issue**: `detector.ts` uses 'fab' strategy which isn't in `DetectResult['strategy']` type
- **Root Cause**: Strategy enum not centralized
- **Recommended Fix**: Update `DetectResult['strategy']` to include 'fab'
- **Files to Modify**: `entrypoints/content/detector.ts`

### 2.4 `generate` is `null` Initially (P1)
- **Issue**: `generate` starts as null, then we use `generate!` (non-null assertion) in ChipBar
- **Root Cause**: Async AI init race condition
- **Recommended Fix**: Only render ChipBar after AI is initialized
- **Files to Modify**: `entrypoints/content.tsx`

### 2.5 No Input Validation (P1)
- **Issue**: `shared/services.ts` functions accept any inputs without validation
- **Root Cause**: No validation logic
- **Recommended Fix**: Add simple input validation to service functions
- **Files to Modify**: `shared/services.ts`

---

## 3. Performance

### 3.1 `getMemoryStats()` Multiple Queries (P2)
- **Issue**: Does 5 separate DB queries (total, weekly, 4 byAction)
- **Root Cause**: No aggregate query usage
- **Recommended Fix**: Optimize to a single transaction, calculate stats in one pass
- **Files to Modify**: `shared/services.ts`

### 3.2 `watchAnchor()` Observes Entire Document (P2)
- **Issue**: MutationObserver on entire `document.body` to check if anchor is removed
- **Root Cause**: Overly broad observation
- **Recommended Fix**: Observe anchor's parent instead, or use `MutationObserver` on anchor + check `document.contains(anchor)`
- **Files to Modify**: `entrypoints/content.tsx`

---

## 4. Security

### 4.1 No Message Shape Validation (P1)
- **Issue**: Background accepts any message with sender.id === extension ID, no schema validation
- **Root Cause**: No validation on incoming requests
- **Recommended Fix**: Add runtime validation for `BackgroundRequest` using type predicates
- **Files to Modify**: `shared/messaging.ts`, `entrypoints/background.ts`

### 4.2 No XSS Protection for Variables (P2)
- **Issue**: Variables substituted directly into text without sanitization
- **Root Cause**: No sanitization step
- **Recommended Fix**: Add sanitization function (though low risk in content script isolated world)
- **Files to Modify**: `entrypoints/content.tsx` (variable substitution function)

---

## 5. Scalability

### 5.1 No Pagination (P2)
- **Issue**: `listRecentMemory`, `listVariables`, `listSavedPrompts` load all entries at once
- **Root Cause**: No pagination support
- **Recommended Fix**: Add limit/offset or cursor-based pagination
- **Files to Modify**: `shared/services.ts`, `shared/messaging.ts`, `entrypoints/background.ts`, `entrypoints/sidepanel/App.tsx`

### 5.2 No Memory Entry Limit (P3)
- **Issue**: Memory entries can grow indefinitely
- **Root Cause**: No pruning logic
- **Recommended Fix**: Auto-prune old entries (e.g., > 1000 or > 30 days)
- **Files to Modify**: `shared/services.ts`

---

## 6. UX/UI

### 6.1 No Edit Functionality (P1)
- **Issue**: Can't edit existing variables or saved prompts
- **Root Cause**: No edit UI or backend logic
- **Recommended Fix**: Add edit dialogs, update service functions to support edits
- **Files to Modify**: `shared/services.ts`, `entrypoints/sidepanel/App.tsx`

### 6.2 No Search/Filter (P2)
- **Issue**: Can't search/filter memory, variables, or saved prompts
- **Root Cause**: No search UI/filtering logic
- **Recommended Fix**: Add search input + filter logic
- **Files to Modify**: `entrypoints/sidepanel/App.tsx`

### 6.3 DiffView Shows No Actual Diff (P2)
- **Issue**: DiffView just shows original vs improved, not line-by-line diff
- **Root Cause**: No diff library integrated
- **Recommended Fix**: Add `diff` npm package, show line-by-line diff
- **Files to Modify**: `package.json`, `entrypoints/content/ui/DiffView.tsx`

### 6.4 FAB Has Hardcoded Styles (P3)
- **Issue**: FAB in detector.ts uses inline styles, not Tailwind
- **Root Cause**: FAB is created outside React tree
- **Recommended Fix**: Use CSS classes or move FAB to React component
- **Files to Modify**: `entrypoints/content/detector.ts`

---

## 7. Accessibility

### 7.1 No ARIA Labels (P1)
- **Issue**: Buttons/chips in ChipBar have no ARIA labels
- **Root Cause**: No accessibility considerations
- **Recommended Fix**: Add `aria-label` to all interactive elements
- **Files to Modify**: `entrypoints/content/ui/ChipBar.tsx`, `entrypoints/sidepanel/App.tsx`

### 7.2 Limited Keyboard Navigation (P2)
- **Issue**: Only Escape key closes diff; no other keyboard shortcuts
- **Root Cause**: No keyboard event handling
- **Recommended Fix**: Add keyboard shortcuts (e.g., Enter to accept, Esc to reject)
- **Files to Modify**: `entrypoints/content/ui/ChipBar.tsx`, `entrypoints/content/ui/DiffView.tsx`

### 7.3 No Focus Management (P2)
- **Issue**: Dialogs in side panel don't manage focus
- **Root Cause**: No focus trapping/restore
- **Recommended Fix**: Add focus management to dialogs
- **Files to Modify**: `entrypoints/sidepanel/App.tsx`

---

## 8. Testing

### 8.1 No Tests (P1)
- **Issue**: No unit, integration, or E2E tests
- **Root Cause**: No test setup
- **Recommended Fix**: Set up Vitest for unit tests, Playwright for E2E tests
- **Files to Modify**: `package.json`, create test files

---

## 9. DX

### 9.1 No Linting/Formatting (P2)
- **Issue**: No ESLint or Prettier config
- **Root Cause**: No dev tooling setup
- **Recommended Fix**: Add ESLint, Prettier, and configuration
- **Files to Modify**: `package.json`, create config files

### 9.2 No Type Check Script (P1)
- **Issue**: Package.json only has wxt scripts, no type check script
- **Root Cause**: Missing script
- **Recommended Fix**: Add `typecheck` script to package.json
- **Files to Modify**: `package.json`

---

## 10. Documentation

### 10.1 No CONTRIBUTING.md (P3)
- **Issue**: No contributing guide
- **Root Cause**: No documentation
- **Recommended Fix**: Add CONTRIBUTING.md
- **Files to Create**: `CONTRIBUTING.md`

---

## Implementation Order (Safest First)

1. P0: Fix telemetry persistence + fix DetectResult strategy type
2. P1: Type centralization, ErrorBoundary usage, any types, generate null fix, validation
3. P2: Magic numbers, performance, UX/UI, accessibility
4. P3: Scalability, documentation

## Plan - 4 Week Ship to Chrome Web Store

### Week 1: Foundation - Isolation & Injector
**Goal:** Extension injects without breaking any chat app CSS.

**Tasks:**
- Init WXT `pnpm create wxt@latest` + React + TypeScript
- Implement `createShadowRootUi` with `mode:'closed'`, `position:'overlay'`, `isolateEvents:true` - verified true bidirectional isolation
- Add `all:initial` + px-only system, fix `rem` bug that makes UI wrong size on Reddit/ChatGPT
- Content script `world: ISOLATED`, `run_at: document_idle`, entry <50KB

**Deliverable:** Blank chip bar renders on 5 test sites, no CSS bleed.

### Week 2: Detection - 100% Attach
**Goal:** Never miss input, even when ChatGPT recreates textarea after every message.

**Tasks:**
- Build adapter map: `chatgpt.com -> #prompt-textarea`, `claude.ai -> div[contenteditable][data-placeholder]`
- Add ARIA fallback `getByRole('textbox')` + heuristic bottom 40%
- Implement `focusin` 0ms attach - catches `contentEditable==='true'` + `document.activeElement`
- Dual `MutationObserver`: body subtree + chat container parent, no debounce on focusin
- FAB fallback after 2000ms if no anchor

**Acceptance:** `detect_success` >98% without FAB on manual test matrix.

### Week 3: Anchor + AI Engine
**Goal:** Chip stays glued, improve in <800ms, 0 cost.

**Tasks:**
- Floating UI `computePosition` + `autoUpdate` + middleware `offset(8), flip(), shift()` - verified anchor positioning library
- `ResizeObserver` + Navigation API listener for SPA
- AI: `LanguageModel.availability()` check, base session create once, `clone()` per task - verified best practice original remains unchanged, clones independent
- Prompt templates: Improve, Concise, Add Context, Format as Table
- Cache: Orama index + Dexie, `hash(original)` dedup

**Acceptance:** Type, send, type again - chip reappears <100ms, improve uses clone not create.

### Week 4: UX Polish + Store Ship
**Goal:** Feels native like 1Password, passes review.

**Tasks:**
- Placement `top-start`, 36px bar, diff view Accept not auto-replace
- Keyboard: Tab cycle, Enter apply, Esc dismiss
- Security: Read input only on explicit click, show "Runs on-device" badge
- Fix CSP: No eval, no remote code, no MAIN world - 35% rejections are CSP violations
- Telemetry: `detect_success_by_strategy`, `ai_latency_ms`
- Store assets: screenshots on ChatGPT/Claude, 1280x800, privacy policy

**Ship Checklist:**
- [ ] <50KB entry, closed shadow, px units
- [ ] focusin + dual observer + FAB
- [ ] Floating UI top-start + autoUpdate
- [ ] availability() + clone pattern

**Day 29-30:** Submit to Chrome Web Store with remote adapter config JSON for hotfixing new DOMs without update.
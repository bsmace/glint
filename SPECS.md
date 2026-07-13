## Specs - Overlay Prompt Assist 2026 - V1.0 Production

### 1. Overview
A browser extension that overlays on any chat AI app to improve prompts instantly, on-device, 0 API cost.

**Non-goals V1:** No auto-send, no reading history without explicit action, no cloud prompts.

### 2. Functional Specs

**FR-1 Detection**
- Must detect input on: chatgpt.com, claude.ai, gemini.google.com, meta.ai, perplexity.ai, poe.com + any `textarea` / `[contenteditable="true"]` / `[role="textbox"]`
- Detection latency: <100ms after `focusin`
- Strategy chain: Site Adapter -> ARIA role -> Heuristic -> focusin fallback
- Must re-detect after SPA navigation via Navigation API + MutationObserver on body and chat container

**FR-2 Anchoring**
- Use Floating UI `computePosition` with middleware `offset(8), flip(), shift({padding:8})`
- Placement: `top-start` only - never cover Send button
- Re-anchor on: `ResizeObserver(input)`, scroll, window resize, DOM mutation
- Fallback: Floating Action Button bottom-right if no anchor after 2000ms

**FR-3 Isolation**
- Implementation: WXT `createShadowRootUi(ctx, {name, position:'overlay'})`
- Mode: `closed` shadow root
- CSS: `all:initial` reset, use `px` not `rem` - `rem` is not isolated, relative to `<html>` outside Shadow DOM, causes wrong size on certain sites
- Event isolation: `isolateEvents:true`

**FR-4 AI Engine**
- Check: `await LanguageModel.availability()` returns `available | downloadable | downloading | unavailable`
- Best practice: Create baseline once, `await base.clone()` per task - clones are independent, original unchanged, DO clone for each new task
- Fallback: Transformers.js `Xenova/gemma-2b-it` WASM if unavailable
- Never read prompt on `input` event, only on explicit Improve click

**FR-5 UX**
- Trigger: Input empty + focused 400ms -> show chip bar. Power trigger: `Tab` to accept, `Esc` to dismiss
- Chips V1: `Improve | Concise | Add Context | Format as Table`
- Apply: Show diff view `Original -> Improved` with Accept, not auto-replace
- Keyboard: Fully navigable, `Tab` cycle chips, `Enter` apply

### 3. Data Models

```ts
type Adapter = { domain: string, detect: () => HTMLElement | null }
type AnchorState = { input: HTMLElement, floating: HTMLElement, cleanup: () => void }
type PromptRecord = { id: string, original: string, improved: string, domain: string, createdAt: number, hash: string }
type AISessionPool = { base: LanguageModel, get(): Promise<LanguageModel>, release(s): void }
```

Storage: Dexie `prompts` table, Orama index on `original` for <10ms search.

### 4. Non-Functional

**Performance**
- Content script entry <50KB gzipped
- First paint of chip bar <50ms after attach
- AI improve <800ms on Gemini Nano, <150ms if cached

**Security**
- Execution: `world: ISOLATED` - content scripts execute in isolated world, isolated world is default
- CSP: No `eval`, no remote code, no `world: MAIN` unless explicit bridge needed
- Privacy: Badge "Runs on-device" when `availability()==='available'`

**Compatibility**
- Chrome 128+, Edge 128+ (Prompt API origin trial)
- Firefox: Disable AI, keep prompt library only

### 5. UI Specs

- Height: 36px chip bar, max-width: input width
- Shadow: `0 8px 24px rgba(0,0,0,0.12)`, radius 12px
- Font: System font, 13px, weight 500
- Animation: `transform 150ms ease, opacity 150ms`

### 6. Testing Criteria for 100%

- [ ] Type in ChatGPT, new chat, chip reappears after send
- [ ] Claude contenteditable with `contentEditable==='true'` detection works
- [ ] Resize window, chip stays anchored top
- [ ] Disable JS on page, isolated world still works
- [ ] Uninstall/reinstall, prompt library persists

### 7. Telemetry V1

- `detect_success_by_strategy` {adapter, aria, heuristic, focusin, fab}
- `anchor_reflow_count`
- `ai_latency_ms` {cached, cloned, fallback}

Ship criteria: >98% `detect_success` without FAB, <100ms median anchor latency.
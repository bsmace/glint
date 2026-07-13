# Glint V1 — Implementation Roadmap

> **For agentic workers:** subagent-driven-development or executing-plans. Checkboxes track.
> **Goal:** Ship Chrome ext overlaying chat AIs → expand short prompts to outcome-first (RARE), on-device, 0 API cost, 100% attach.
> **Arch:** WXT + Preact + TS. `createShadowRootUi(closed)` → Floating UI anchor → `LanguageModel` clone pool → Dexie. 5 layers + library/memory/weekly.
> **Stack:** WXT, Preact, Floating UI, Chrome Prompt API (`LanguageModel`), heuristic string fallback, Dexie.
> **Scope:** ALL 7 features, ~6wk (M1-M5).

## Why → Feature (verified pain)

| Pain | Feature |
|------|---------|
| P1 wrong prompts / P2 generic garbage / P4 blank freeze | 4 chips |
| P3 old prompts break | RARE outcome-first, model-agnostic |
| P5 custom-instructions limit | variables + memory |
| A instant access | Ctrl+Shift+P + side panel |
| B organize | folders + drag/drop + instant search |
| D templates/memory/history | library + memory |
| F stickiness | local-only, no lag, no aggressive popups; weekly review |

## File Map

```
entrypoints/content.tsx   // createShadowRootUi closed, ISOLATED
entrypoints/content/
  ai.ts                   // initPromptAPI (LanguageModel on-device) + initFallback (string-only)
  detector.ts             // adapters + focusin + dual observer + FAB
  ui/
    ChipBar.tsx           // 4 chips: Improve/Concise/AddContext/Format
    DiffView.tsx
entrypoints/sidepanel/
  App.tsx                 // memory/variables/library side panel
entrypoints/background.ts // Dexie memory/telemetry/variables/folders/prompts only
wxt.config.ts
```

## M1 Foundation/Isolation (W1)

- [x] WXT init Preact+TS; world:ISOLATED, run_at:document_idle, entry <50KB gz
- [x] `createShadowRootUi(ctx,{name:'glint',position:'overlay',mode:'closed',isolateEvents:true})`
- [x] CSS `all:initial` + px-only (no rem); verify no bleed ChatGPT/Reddit/Claude
- [x] Test: blank ChipBar on 5 sites, page CSS unchanged
- [x] Commit

## M2 Detection + Instant Access (W2)

- [x] Adapter map: chatgpt→#prompt-textarea, claude→div[contenteditable][data-placeholder], gemini/meta/perplexity/poe
- [x] ARIA `getByRole('textbox')` + heuristic (largest textarea bottom 40%)
- [x] `focusin` 0ms attach (capture:true, match textarea,[contenteditable="true"],[role="textbox"])
- [x] Dual `MutationObserver` (body subtree + chat container), no debounce on focusin
- [x] FAB after 2000ms
- [x] `Ctrl+Shift+P` global shortcut → floating window; Chrome `sidePanel` access
- [x] Test: new chat after send re-attach; shortcut opens; `detect_success_by_strategy` logged
- [x] Commit

## M3 Anchor + AI + RARE + Variables (W3)

- [x] Floating UI `computePosition` + `autoUpdate(input,floating,[offset(8),flip(),shift({padding:8})])` top-start
- [x] `ResizeObserver(input)` + Navigation API + scroll/window resize re-anchor
- [x] `LanguageModel.availability()` → available: `base=create()` once, `base.clone()` per task; else heuristic string fallback
- [x] Templates (RARE = Role/Ask/Rules/Example):
  - **Improve:** rewrite → RARE outcome-first
  - **Concise:** strip process-stack, keep outcome
  - **Add Context:** ask "What did it miss? Audience? Format? Constraint?" → append 1 item
  - **Format:** table/structured
- [x] `{{audience}}`/`{{tone}}`/`{{goal}}` parse + substitute from saved profile; inject 1 Example if provided
- [x] Cache: Dexie, `hash(original)` dedup, last 20
- [x] Test: clone-not-create; cached<150ms; variables fill; RARE output correct
- [x] Commit

## M4 Library: Folders + Memory + Search (W4)

- [x] Dexie `prompts`+`folders` tables; drag/drop organize; variable placeholders per prompt
- [x] Dexie index `original` → search <10ms
- [x] Memory: save role/tone/vars once → auto-inject
- [x] Test: save/search/persist across reinstall; memory auto-injects
- [x] Commit

## M5 UX + Telemetry + Ship (W5-W6)

- [x] 36px chip bar, ghost diff Original→Improved, Accept(Tab)/Esc; read input ONLY on click
- [x] Keyboard: Tab cycle, Enter apply, Esc dismiss
- [x] "Runs on-device" badge when `availability()==='available'`
- [x] CSP clean: no eval/remote/MAIN world
- [x] ~~Weekly review~~ (deferred — not shipped)
- [x] Telemetry: `detect_success_by_strategy`, `anchor_reflow_count`, `ai_latency_ms{cached,cloned,fallback}`
- [x] Store assets 1280x800 + privacy policy; submitted
- [x] Commit

## Tracking

| ID | Milestone | Status |
|----|-----------|--------|
| M1 | Foundation/Isolation | ✔ |
| M2 | Detection+Access | ✔ |
| M3 | Anchor+AI+RARE+Vars | ✔ |
| M4 | Library+Folders+Mem | ✔ |
| M5 | UX+Telemetry+Ship | ✔ (weekly review deferred) |

## Risks

- `LanguageModel` origin-trial → heuristic string fallback (no external deps)
- Firefox: AI off, library only
- Performance: entry<50KB, paint<50ms, AI<800ms(cloned)/<150ms(cached)

## Ship Gates

`detect_success_without_FAB` >98% · median attach <100ms · improve accept >40% · D7 retention >25%

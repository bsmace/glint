# Glint V1 — Implementation Roadmap

> **For agentic workers:** subagent-driven-development or executing-plans. Checkboxes track.
> **Goal:** Ship Chrome ext overlaying chat AIs → expand short prompts to outcome-first (RARE), on-device, 0 API cost, 100% attach.
> **Arch:** WXT + Preact + TS. `createShadowRootUi(closed)` → Floating UI anchor → `LanguageModel` clone pool → Dexie. 5 layers + library/memory/weekly.
> **Stack:** WXT, Preact, Floating UI, Chrome Prompt API (`LanguageModel`), heuristic string fallback, Dexie.
> **Scope:** ALL 7 features, ~6wk (M1-M5).

## Why → Feature (verified pain)

| Pain | Feature |
|------|---------|
| P1 wrong prompts / P2 generic garbage / P4 blank freeze | chips + Expand |
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

- [ ] WXT init React+TS; world:ISOLATED, run_at:document_idle, entry <50KB gz
- [ ] `createShadowRootUi(ctx,{name:'glint',position:'overlay',mode:'closed',isolateEvents:true})`
- [ ] CSS `all:initial` + px-only (no rem); verify no bleed ChatGPT/Reddit/Claude
- [ ] Test: blank ChipBar on 5 sites, page CSS unchanged
- [ ] Commit

## M2 Detection + Instant Access (W2)

- [ ] Adapter map: chatgpt→#prompt-textarea, claude→div[contenteditable][data-placeholder], gemini/meta/perplexity/poe
- [ ] ARIA `getByRole('textbox')` + heuristic (largest textarea bottom 40%)
- [ ] `focusin` 0ms attach (capture:true, match textarea,[contenteditable="true"],[role="textbox"])
- [ ] Dual `MutationObserver` (body subtree + chat container), no debounce on focusin
- [ ] FAB after 2000ms
- [ ] `Ctrl+Shift+P` global shortcut → floating window; Chrome `sidePanel` access
- [ ] Test: new chat after send re-attach; shortcut opens; `detect_success_by_strategy` logged
- [ ] Commit

## M3 Anchor + AI + RARE + Variables (W3)

- [ ] Floating UI `computePosition` + `autoUpdate(input,floating,[offset(8),flip(),shift({padding:8})])` top-start
- [ ] `ResizeObserver(input)` + Navigation API + scroll/window resize re-anchor
- [ ] `LanguageModel.availability()` → available: `base=create()` once, `base.clone()` per task; else Transformers.js `Xenova/gemma-2b-it` WASM
- [ ] Templates (RARE = Role/Ask/Rules/Example):
  - **Improve:** rewrite → RARE outcome-first
  - **Concise:** strip process-stack, keep outcome
  - **Add Context:** ask "What did it miss? Audience? Format? Constraint?" → append 1 item
  - **Format:** table/structured
- [ ] `{{audience}}`/`{{tone}}`/`{{goal}}` parse + substitute from saved profile; inject 1 Example if provided
- [ ] Cache: Orama+Dexie, `hash(original)` dedup, last 20
- [ ] Test: clone-not-create; cached<150ms; variables fill; RARE output correct
- [ ] Commit

## M4 Library: Folders + Memory + Search (W4)

- [ ] Dexie `prompts`+`folders` tables; drag/drop organize; variable placeholders per prompt
- [ ] Orama index `original` → search <10ms
- [ ] Memory: save role/tone/vars once → auto-inject into Expand
- [ ] Test: save/search/persist across reinstall; memory auto-injects
- [ ] Commit

## M5 UX + Weekly Review + Ship (W5-W6)

- [ ] 36px chip bar, ghost diff Original→Improved, Accept(Tab)/Esc; read input ONLY on click
- [ ] Keyboard: Tab cycle, Enter apply, Esc dismiss
- [ ] "Runs on-device" badge when `availability()==='available'`
- [ ] CSP clean: no eval/remote/MAIN world
- [ ] Weekly review: aggregate top prompts by Accept+Save count
- [ ] Telemetry: `detect_success_by_strategy`, `anchor_reflow_count`, `ai_latency_ms{cached,cloned,fallback}`
- [ ] Store assets 1280x800 + privacy policy; submit + remote adapter JSON for hotfix
- [ ] Commit

## Tracking

| ID | Milestone | Status |
|----|-----------|--------|
| M1 | Foundation/Isolation | ☐ |
| M2 | Detection+Access | ☐ |
| M3 | Anchor+AI+RARE+Vars | ☐ |
| M4 | Library+Folders+Mem | ☐ |
| M5 | UX+Weekly+Ship | ☐ |

## Risks

- `LanguageModel` origin-trial → Transformers.js fallback MUST
- Firefox: AI off, library only
- Performance: entry<50KB, paint<50ms, AI<800ms(cloned)/<150ms(cached)

## Ship Gates

`detect_success_without_FAB` >98% · median attach <100ms · improve accept >40% · D7 retention >25%

## PRD - Project **Glint**

**Name:** Glint - the little flash that makes your prompt shine. Short, 5 letters, verb-able: "Glint it".

Tagline: *Type less, mean more.*

### 1. Vision
Every chat box gets a co-pilot that turns vague thoughts into perfect prompts in 200ms, on-device, no copy-paste, no tab switching.

### 2. Problem
From research: Users waste 5-10 min per chat re-typing context, do 3-4 tries to get good output, have no reusable library, and prompts break after model updates. They stare at blank box and write "make logo" -> generic trash.

### 3. Solution - Glint Overlay
A 36px chip bar that lives *above* any chat input, isolated in closed Shadow DOM via `createShadowRootUi` for true bidirectional CSS isolation. Detects any textbox via 4-stage chain + `focusin`, anchors with Floating UI `computePosition` with `offset, flip, shift` to stay in view, improves with on-device `LanguageModel` where `availability()` is checked and baseline session is cloned per task for 10ms improves.

### 4. Target Users
- **Power Prompters:** Use ChatGPT/Claude 5+ times/day
- **Builders:** Devs, marketers who reuse prompts
- **Mobile-first typers:** Hate typing long prompts on phone

### 5. User Stories

**US-1:** As I focus an empty chat box, I see Glint chips in <100ms without clicking.
**US-2:** As I type "logo for coffee shop", I press Tab, Glint shows diff: Original -> Improved with role, context, format, I click Accept.
**US-3:** As I send a message, ChatGPT recreates the textarea, Glint re-attaches in 0ms via `focusin` + dual `MutationObserver`, not 50ms debounce.
**US-4:** As privacy-concerned user, I see "Runs on-device" badge and my prompt never leaves device when `LanguageModel.availability()==='available'`.

### 6. Functional Requirements

**F-1 Detection:** Adapters for chatgpt.com, claude.ai, gemini, meta.ai, perplexity + ARIA `getByRole('textbox')` + heuristic + `contentEditable==='true'` check. FAB fallback after 2s.
**F-2 Anchor:** `top-start` placement, never cover Send. `autoUpdate` + `ResizeObserver` + Navigation API for SPA.
**F-3 AI:** 4 chips V1: Improve, Concise, Add Context, Format. Cache last 20 via Orama, hash dedup.
**F-4 Library:** Save improved prompts locally in Dexie, search <10ms.

### 7. Non-Functional - Must Pass Store

- Entry <50KB gzipped, `world: ISOLATED` - isolated world is default, content scripts execute in isolated world, avoid `MAIN` to prevent CSP rejection - 35% rejections are CSP/inline script violations
- Isolation: `closed` shadow, `all:initial`, px only - `rem` is not isolated, causes wrong size on Reddit
- Read input only on explicit Improve click - not on `input` event - avoids keylogger perception
- Performance: Chip paint <50ms, AI <800ms, cached <150ms

### 8. Success Metrics - V1

- `detect_success_without_FAB` >98%
- Median attach latency <100ms
- Improve accept rate >40%
- Day 7 retention >25%

### 9. Roadmap

**V1 (4 weeks):** Detection, anchor, 4 chips, on-device AI, local library
**V1.1:** Remote adapter config JSON - hotfix DOM changes without store update
**V2:** Team prompt library sync, brand voice enforcement, A/B test prompts

### 10. Monetization

Free: 30 improves/day on-device unlimited
Pro $7/mo: Unlimited, custom chip builder, team library, prompt versioning

**One-line pitch:** Glint is Grammarly for prompting - it doesn't write for you, it makes what you meant shine.
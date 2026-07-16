# Implementation Plan — Weekly Review Reminder

## Steps (Sequential)

### 1. DATA: new Dexie table + service functions
- Add `settings` table to `shared/db.ts` (version 5): `++id, &key` with `{ key, value }` — generic key-value for preferences
- Add `setSetting(key, value)`, `getSetting(key)`, `getAllSettings()` to `shared/services.ts`
- Background alarm management: `scheduleWeeklyReview()` creates/deletes `chrome.alarms`
- New `BackgroundRequest` types: `'setSetting'`, `'getSetting'`, `'dismissReview'`, `'getStalePrompts'`, `'getStaleMemory'`

### 2. API: new BackgroundRequest types + handlers
- Extend `BackgroundRequest` discriminated union in `shared/messaging.ts`
- Implement handlers in `background.ts` switch statement
- Move alarm listener to `entrypoints/background.ts`

### 3. UI: Review tab in side panel
- Add `'review'` to `Tab` type in `App.tsx`
- Add tab item + `TabsContent` block with:
  - Stale prompts section (checkbox list + bulk delete button)
  - Stale memory section
  - "All caught up" empty state
  - Opt-out toggle at bottom of tab
- Badge dot on Review tab when there are stale items

### 4. INTEGRATION: alarm ↔ sidepanel wiring
- `chrome.alarms.onAlarm` listener in background sets `pendingReview: true` in settings table
- Sidepanel `useEffect` on mount checks `getSetting('pendingReview')`, shows badge
- On Chrome: alarm handler also calls `chrome.sidePanel.open()` + sends message to toggle review tab
- On Firefox: alarm handler just sets pendingReview flag; sidepanel badge indicates pending review on next open

### 5. VERIFY: build + typecheck both targets
- `pnpm build && pnpm build:firefox && pnpm typecheck`

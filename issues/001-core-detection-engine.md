# Issue #001: Core Detection Engine Verification & Enhancement

**Created**: 2026-07-16  
**Priority**: High  
**Status**: In Progress  
**Phase**: Foundation (Phase 1)  

---

## Problem Statement

The DetectionManager implementation exists but requires verification against the "Devil's Advocate" criteria:
- **Site Fragility**: Will detection break when sites update their DOM structures?
- **Privacy**: Does detection leak any user data to external services?
- **Performance**: Does continuous detection impact main thread performance (target: <50KB core bundle, 120Hz scrolling)?

Additionally, the current implementation needs:
1. Better handling of Shadow DOM contexts (some AI sites use shadow roots for inputs)
2. Improved confidence scoring based on multiple signal correlation
3. Unit test coverage for each strategy

---

## Proposed Solution

### 1. Enhance DetectionManager with Shadow DOM Support

Add capability to detect inputs within Shadow DOM boundaries by:
- Scanning all `shadowRoot` instances on the page
- Applying detection strategies recursively across shadow boundaries
- Caching shadow root references to avoid repeated queries

### 2. Improve Confidence Scoring

Implement multi-signal correlation:
- Base confidence from strategy match (AriaTextboxStrategy = 0.95)
- Bonus points for nearby send button detection (+0.03)
- Bonus points for chat-related class names (+0.02)
- Penalty for hidden or disabled elements (-0.50)
- Cap confidence at 1.0

### 3. Add Performance Safeguards

- Throttle detection loop to 10fps (every 100ms) instead of every animation frame
- Cache detection results with 2-second TTL
- Skip detection when page is not visible (Page Visibility API)
- Use `performance.mark()` for detection timing metrics

### 4. Privacy Verification

Ensure detection engine:
- Never sends DOM data to external servers
- Operates entirely client-side
- Does not store element content, only structural metadata
- Respects site's CSP policies

---

## Definition of Done (DoD)

### Code Requirements
- [ ] DetectionManager scans both light and shadow DOM
- [ ] Confidence scoring includes bonus/penalty modifiers
- [ ] Detection loop throttled to 10fps maximum
- [ ] Page visibility check prevents detection on hidden tabs
- [ ] All detection operations logged with `performance.mark()` for profiling

### Testing Requirements
- [ ] Unit tests for AriaTextboxStrategy (covers role="textbox" detection)
- [ ] Unit tests for ContentEditableStrategy (covers contenteditable detection)
- [ ] Unit tests for TextareaStrategy (covers textarea detection)
- [ ] Integration test verifying DetectionManager orchestrates strategies correctly
- [ ] Performance test confirming <2ms detection time on complex pages

### Documentation Requirements
- [ ] JSDoc comments updated for all public methods
- [ ] Architecture diagram in ROADMAP.md reflects shadow DOM scanning
- [ ] AGENTS.md updated with any new technical decisions

### Bundle Size Requirement
- [ ] Core bundle (DetectionManager + dependencies) remains under 50KB gzipped

---

## Implementation Plan

### Step 1: Add Shadow DOM Scanning
```typescript
// In DetectionManager.detect()
private scanShadowRoots(root: Document | ShadowRoot): InputDetectionResult[] {
  const results: InputDetectionResult[] = [];
  const hostElements = root.querySelectorAll('*');
  
  for (const host of Array.from(hostElements)) {
    const shadowRoot = (host as HTMLElement).shadowRoot;
    if (shadowRoot) {
      const shadowResults = this.detect(shadowRoot);
      results.push(...shadowResults);
    }
  }
  
  return results;
}
```

### Step 2: Enhance Confidence Scoring
```typescript
// Add to InputDetectionResult interface
confidenceModifiers: {
  base: number;
  sendButtonBonus: number;
  classNameBonus: number;
  visibilityPenalty: number;
  final: number;
}
```

### Step 3: Implement Throttling
```typescript
// Replace requestAnimationFrame with throttled version
private lastDetectionTime = 0;
private readonly DETECTION_INTERVAL_MS = 100;

private shouldDetect(): boolean {
  const now = performance.now();
  if (now - this.lastDetectionTime < this.DETECTION_INTERVAL_MS) {
    return false;
  }
  this.lastDetectionTime = now;
  return true;
}
```

### Step 4: Add Page Visibility Check
```typescript
// In content.ts detection loop
if (document.hidden) {
  // Skip detection when tab is not visible
  requestAnimationFrame(checkForInputs);
  return;
}
```

---

## Test Cases

### Unit Test: AriaTextboxStrategy
```typescript
describe('AriaTextboxStrategy', () => {
  it('detects input with role="textbox"', () => {
    const html = '<div role="textbox" contenteditable="true"></div>';
    document.body.innerHTML = html;
    const strategy = new AriaTextboxStrategy();
    const result = strategy.detect(document);
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe('aria-textbox');
    expect(result?.confidence).toBeGreaterThan(0.9);
  });

  it('ignores non-editable elements with role="textbox"', () => {
    const html = '<div role="textbox"></div>';
    document.body.innerHTML = html;
    const strategy = new AriaTextboxStrategy();
    const result = strategy.detect(document);
    expect(result).toBeNull();
  });
});
```

### Unit Test: ContentEditableStrategy
```typescript
describe('ContentEditableStrategy', () => {
  it('detects contenteditable chat input', () => {
    const html = `
      <div class="chat-input-container">
        <div contenteditable="true" placeholder="Type a message..."></div>
      </div>
    `;
    document.body.innerHTML = html;
    const strategy = new ContentEditableStrategy();
    const result = strategy.detect(document);
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe('contenteditable');
  });
});
```

### Integration Test: DetectionManager
```typescript
describe('DetectionManager', () => {
  it('orchestrates multiple strategies and returns highest confidence', () => {
    const html = `
      <textarea aria-label="Chat message"></textarea>
      <div role="textbox" contenteditable="true"></div>
    `;
    document.body.innerHTML = html;
    const manager = new DetectionManager();
    const results = manager.detect(document);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].confidence).toBeGreaterThanOrEqual(results[1]?.confidence || 0);
  });

  it('scans shadow DOM for inputs', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<div role="textbox" contenteditable="true"></div>';
    document.body.appendChild(host);
    
    const manager = new DetectionManager();
    const results = manager.detect(document);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.element.shadowRoot)).toBe(true);
  });
});
```

---

## Devil's Advocate Review

### Site Fragility Concern
**Challenge**: What if a site removes ARIA roles or uses custom input components?

**Mitigation**:
- Multiple fallback strategies (ARIA → contenteditable → textarea)
- RemoteAdapter allows selector updates without extension release
- Site-specific adapters override generic detection for known sites

### Privacy Concern
**Challenge**: Could detection accidentally capture sensitive user input?

**Mitigation**:
- Detection only reads structural attributes (role, class, id), never textContent
- No data transmitted externally during detection phase
- All operations occur in content script scope, isolated from network

### Performance Concern
**Challenge**: Won't continuous DOM scanning cause jank?

**Mitigation**:
- Throttled to 10fps (100ms intervals)
- Early exit when inputs already detected (cached results)
- Skips detection on hidden tabs
- MutationObserver targets only relevant attribute changes, not all DOM mutations

---

## Related Files

- `src/core/engine/DetectionManager.ts` - Main implementation
- `src/content.ts` - Detection loop integration
- `src/adapters/sites/*.ts` - Site-specific strategy overrides
- `ROADMAP.md` - Phase tracking
- `AGENTS.md` - Technical decision log

---

## Success Metrics

1. **Detection Accuracy**: >95% success rate on ChatGPT, Claude, Gemini
2. **Performance**: <2ms per detection cycle on mid-range devices
3. **Bundle Size**: Core engine <50KB gzipped
4. **Test Coverage**: >80% line coverage for DetectionManager

---

*Status will be updated as implementation progresses*

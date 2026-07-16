/**
 * Glint Core - Detection Manager
 * Orchestrates detection strategies to find active input fields.
 */

import { DetectionStrategy, InputContext, defaultStrategies } from "./strategies";

export class DetectionManager {
  private strategies: DetectionStrategy[];
  private currentHighlight: HTMLElement | null = null;

  constructor(strategies: DetectionStrategy[] = defaultStrategies) {
    // Sort by priority (lower number = higher priority)
    this.strategies = [...strategies].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Scans the DOM for the best available input target.
   * Uses a "Devil's Advocate" approach: checks focus first, then falls back to visible inputs.
   */
  findTarget(): { element: HTMLElement; context: InputContext } | null {
    // 1. Check currently focused element first (Performance optimization)
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      const match = this.evaluateElement(activeElement);
      if (match) return match;
    }

    // 2. Fallback: Query common selectors (Site-agnostic search)
    const candidates = document.querySelectorAll(
      'input[type="text"], textarea, [role="textbox"], [role="combobox"], [contenteditable="true"]'
    );

    for (const candidate of candidates) {
      const match = this.evaluateElement(candidate as HTMLElement);
      if (match) return match;
    }

    return null;
  }

  private evaluateElement(element: HTMLElement): { element: HTMLElement; context: InputContext } | null {
    for (const strategy of this.strategies) {
      if (strategy.matches(element)) {
        return {
          element,
          context: strategy.extractContext(element),
        };
      }
    }
    return null;
  }

  /**
   * Highlights the detected target using the matched strategy.
   */
  highlightTarget(element: HTMLElement): void {
    this.clearHighlight();
    
    for (const strategy of this.strategies) {
      if (strategy.matches(element)) {
        strategy.highlight(element);
        this.currentHighlight = element;
        break;
      }
    }
  }

  /**
   * Removes any existing highlights.
   */
  clearHighlight(): void {
    if (this.currentHighlight) {
      // Find the strategy that highlighted it to unhighlight correctly
      for (const strategy of this.strategies) {
        if (strategy.matches(this.currentHighlight!)) {
          strategy.unhighlight(this.currentHighlight!);
          break;
        }
      }
      this.currentHighlight = null;
    }
  }

  /**
   * Registers a custom detection strategy.
   */
  registerStrategy(strategy: DetectionStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }
}

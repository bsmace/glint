/**
 * Glint - Detection Engine v2.0
 * Site-agnostic chat input detection using Strategy Pattern
 * Detects inputs via ARIA roles, contenteditable, semantic patterns, and Shadow DOM scanning
 * 
 * Performance Targets:
 * - <2ms per detection cycle
 * - 10fps throttling (100ms intervals)
 * - <50KB core bundle size
 * - Zero privacy leaks (structural metadata only)
 */

import { signal } from '@preact/signals-core';

/**
 * Confidence score modifiers for multi-signal correlation
 */
export interface ConfidenceModifiers {
  base: number;
  sendButtonBonus: number;
  classNameBonus: number;
  visibilityPenalty: number;
  final: number;
}

/**
 * Result of a successful input detection
 */
export interface InputDetectionResult {
  element: HTMLElement;
  strategy: string;
  confidence: number;
  confidenceModifiers: ConfidenceModifiers;
  metadata: {
    ariaRole?: string;
    isContentEditable?: boolean;
    placeholder?: string;
    nearbySendButton?: HTMLElement | null;
    inShadowDOM?: boolean;
  };
  detectedAt: number; // Timestamp for cache TTL
}

/**
 * Strategy interface for input detection
 */
export interface DetectionStrategy {
  name: string;
  detect(root: Document | ShadowRoot): InputDetectionResult | null;
}

/**
 * Strategy: Detect inputs by ARIA role="textbox"
 * Most reliable semantic pattern across modern AI chat interfaces
 */
export class AriaTextboxStrategy implements DetectionStrategy {
  readonly name = 'aria-textbox';

  detect(root: Document | ShadowRoot): InputDetectionResult | null {
    const elements = root.querySelectorAll('[role="textbox"]');
    
    for (const el of Array.from(elements)) {
      const htmlEl = el as HTMLElement;
      
      // Verify it's actually editable
      const isEditable = htmlEl.isContentEditable || 
                         htmlEl.getAttribute('contenteditable') === 'true' ||
                         htmlEl.tagName === 'TEXTAREA' ||
                         (htmlEl.tagName === 'INPUT' && htmlEl.getAttribute('type') !== 'button');
      
      if (isEditable) {
        const sendButton = this.findNearbySendButton(htmlEl, root);
        const inShadowDOM = root instanceof ShadowRoot;
        
        // Calculate confidence with modifiers
        const baseConfidence = 0.95;
        const sendButtonBonus = sendButton ? 0.03 : 0;
        const classNameBonus = this.hasChatClassName(htmlEl) ? 0.02 : 0;
        const visibilityPenalty = this.isHiddenOrDisabled(htmlEl) ? 0.50 : 0;
        const finalConfidence = Math.min(1.0, baseConfidence + sendButtonBonus + classNameBonus - visibilityPenalty);
        
        return {
          element: htmlEl,
          strategy: this.name,
          confidence: finalConfidence,
          confidenceModifiers: {
            base: baseConfidence,
            sendButtonBonus,
            classNameBonus,
            visibilityPenalty,
            final: finalConfidence,
          },
          metadata: {
            ariaRole: 'textbox',
            isContentEditable: htmlEl.isContentEditable,
            placeholder: htmlEl.getAttribute('placeholder') || undefined,
            nearbySendButton: sendButton,
            inShadowDOM,
          },
          detectedAt: performance.now(),
        };
      }
    }
    
    return null;
  }
  
  private hasChatClassName(element: HTMLElement): boolean {
    const className = element.className?.toLowerCase() || '';
    const id = element.id?.toLowerCase() || '';
    return (
      className.includes('chat') ||
      className.includes('input') ||
      className.includes('composer') ||
      id.includes('chat') ||
      id.includes('input')
    );
  }
  
  private isHiddenOrDisabled(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      element.hidden ||
      element.hasAttribute('disabled') ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity) < 0.5
    );
  }

  private findNearbySendButton(element: HTMLElement, root: Document | ShadowRoot): HTMLElement | null {
    // Look for send button within 200px or in parent hierarchy
    const parent = element.closest('form, [data-testid="chat-input-container"], div[class*="input"]');
    
    if (parent) {
      const sendButtons = parent.querySelectorAll(
        'button[aria-label*="send"], button[aria-label*="submit"], ' +
        '[data-testid*="send"], [class*="send-button"], ' +
        'svg[aria-label*="send"], svg[class*="send"]'
      );
      
      for (const btn of Array.from(sendButtons)) {
        const htmlBtn = btn as HTMLElement;
        if (this.isSendButton(htmlBtn)) {
          return htmlBtn;
        }
      }
    }
    
    return null;
  }

  private isSendButton(element: HTMLElement): boolean {
    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
    const textContent = element.textContent?.toLowerCase() || '';
    const className = element.className?.toLowerCase() || '';
    
    return (
      ariaLabel.includes('send') ||
      ariaLabel.includes('submit') ||
      textContent.includes('send') ||
      className.includes('send')
    );
  }
}

/**
 * Strategy: Detect contenteditable elements without explicit ARIA
 * Fallback for sites that don't use proper ARIA labeling
 */
export class ContentEditableStrategy implements DetectionStrategy {
  readonly name = 'contenteditable';

  detect(root: Document | ShadowRoot): InputDetectionResult | null {
    const elements = root.querySelectorAll('[contenteditable="true"], [contenteditable=""]');
    
    for (const el of Array.from(elements)) {
      const htmlEl = el as HTMLElement;
      
      // Skip if already has textbox role (handled by AriaTextboxStrategy)
      if (htmlEl.getAttribute('role') === 'textbox') {
        continue;
      }
      
      // Check if this looks like a chat input (not a rich text editor)
      if (this.isChatInput(htmlEl)) {
        const sendButton = this.findNearbySendButton(htmlEl, root);
        const inShadowDOM = root instanceof ShadowRoot;
        
        // Calculate confidence with modifiers
        const baseConfidence = 0.85;
        const sendButtonBonus = sendButton ? 0.03 : 0;
        const classNameBonus = this.hasChatClassName(htmlEl) ? 0.02 : 0;
        const visibilityPenalty = this.isHiddenOrDisabled(htmlEl) ? 0.50 : 0;
        const finalConfidence = Math.min(1.0, baseConfidence + sendButtonBonus + classNameBonus - visibilityPenalty);
        
        return {
          element: htmlEl,
          strategy: this.name,
          confidence: finalConfidence,
          confidenceModifiers: {
            base: baseConfidence,
            sendButtonBonus,
            classNameBonus,
            visibilityPenalty,
            final: finalConfidence,
          },
          metadata: {
            isContentEditable: true,
            placeholder: htmlEl.getAttribute('placeholder') || undefined,
            nearbySendButton: sendButton,
            inShadowDOM,
          },
          detectedAt: performance.now(),
        };
      }
    }
    
    return null;
  }
  
  private hasChatClassName(element: HTMLElement): boolean {
    const className = element.className?.toLowerCase() || '';
    const id = element.id?.toLowerCase() || '';
    return (
      className.includes('chat') ||
      className.includes('input') ||
      className.includes('composer') ||
      id.includes('chat') ||
      id.includes('input')
    );
  }
  
  private isHiddenOrDisabled(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      element.hidden ||
      element.hasAttribute('disabled') ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity) < 0.5
    );
  }

  private isChatInput(element: HTMLElement): boolean {
    // Heuristics to distinguish chat inputs from rich text editors
    const parent = element.parentElement;
    const grandParent = parent?.parentElement;
    
    // Check for chat-related class names or attributes in ancestors
    const ancestors = [element, parent, grandParent].filter(Boolean) as HTMLElement[];
    
    for (const ancestor of ancestors) {
      const className = ancestor.className?.toLowerCase() || '';
      const id = ancestor.id?.toLowerCase() || '';
      const dataTestId = ancestor.getAttribute('data-testid')?.toLowerCase() || '';
      
      if (
        className.includes('chat') ||
        className.includes('input') ||
        className.includes('composer') ||
        className.includes('prompt') ||
        id.includes('chat') ||
        id.includes('input') ||
        dataTestId.includes('chat') ||
        dataTestId.includes('input')
      ) {
        return true;
      }
    }
    
    // Check if it's a minimal input structure (typical for chat interfaces)
    const childCount = element.childElementCount;
    return childCount <= 3; // Chat inputs typically have minimal child elements
  }

  private findNearbySendButton(element: HTMLElement, root: Document | ShadowRoot): HTMLElement | null {
    const parent = element.closest('form, div[class*="input"], div[class*="composer"]');
    
    if (parent) {
      const sendButtons = parent.querySelectorAll(
        'button, [role="button"], svg[role="img"], img[role="img"]'
      );
      
      for (const btn of Array.from(sendButtons)) {
        const htmlBtn = btn as HTMLElement;
        if (this.isSendButton(htmlBtn)) {
          return htmlBtn;
        }
      }
    }
    
    return null;
  }

  private isSendButton(element: HTMLElement): boolean {
    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
    const textContent = element.textContent?.toLowerCase() || '';
    const className = element.className?.toLowerCase() || '';
    const tagName = element.tagName.toLowerCase();
    
    // Check for send/submit indicators
    const isSend = (
      ariaLabel.includes('send') ||
      ariaLabel.includes('submit') ||
      textContent.includes('send') ||
      className.includes('send')
    );
    
    // Also check for common send button patterns (paper plane icon, etc.)
    if (tagName === 'svg' || tagName === 'img') {
      const src = element.getAttribute('src')?.toLowerCase() || '';
      const pathData = element.innerHTML?.toLowerCase() || '';
      
      if (
        src.includes('send') ||
        pathData.includes('plane') ||
        pathData.includes('arrow')
      ) {
        return true;
      }
    }
    
    return isSend;
  }
}

/**
 * Strategy: Detect textarea elements commonly used for chat inputs
 */
export class TextareaStrategy implements DetectionStrategy {
  readonly name = 'textarea';

  detect(root: Document | ShadowRoot): InputDetectionResult | null {
    const textareas = root.querySelectorAll('textarea');
    
    for (const el of Array.from(textareas)) {
      const htmlEl = el as HTMLTextAreaElement;
      
      // Skip hidden or disabled textareas
      if (htmlEl.hidden || htmlEl.disabled) {
        continue;
      }
      
      // Check if this looks like a chat input
      if (this.isChatTextarea(htmlEl)) {
        const sendButton = this.findNearbySendButton(htmlEl, root);
        const inShadowDOM = root instanceof ShadowRoot;
        
        // Calculate confidence with modifiers
        const baseConfidence = 0.90;
        const sendButtonBonus = sendButton ? 0.03 : 0;
        const classNameBonus = this.hasChatClassName(htmlEl) ? 0.02 : 0;
        const visibilityPenalty = this.isHiddenOrDisabled(htmlEl) ? 0.50 : 0;
        const finalConfidence = Math.min(1.0, baseConfidence + sendButtonBonus + classNameBonus - visibilityPenalty);
        
        return {
          element: htmlEl,
          strategy: this.name,
          confidence: finalConfidence,
          confidenceModifiers: {
            base: baseConfidence,
            sendButtonBonus,
            classNameBonus,
            visibilityPenalty,
            final: finalConfidence,
          },
          metadata: {
            isContentEditable: true,
            placeholder: htmlEl.placeholder || undefined,
            nearbySendButton: sendButton,
            inShadowDOM,
          },
          detectedAt: performance.now(),
        };
      }
    }
    
    return null;
  }
  
  private hasChatClassName(element: HTMLElement): boolean {
    const className = element.className?.toLowerCase() || '';
    const id = element.id?.toLowerCase() || '';
    return (
      className.includes('chat') ||
      className.includes('input') ||
      className.includes('composer') ||
      id.includes('chat') ||
      id.includes('input')
    );
  }
  
  private isHiddenOrDisabled(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      element.hidden ||
      element.hasAttribute('disabled') ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity) < 0.5
    );
  }

  private isChatTextarea(element: HTMLTextAreaElement): boolean {
    const placeholder = element.placeholder?.toLowerCase() || '';
    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
    const className = element.className?.toLowerCase() || '';
    const id = element.id?.toLowerCase() || '';
    
    // Check for chat-related indicators
    return (
      placeholder.includes('message') ||
      placeholder.includes('chat') ||
      placeholder.includes('prompt') ||
      placeholder.includes('ask') ||
      ariaLabel.includes('chat') ||
      ariaLabel.includes('message') ||
      ariaLabel.includes('input') ||
      className.includes('chat') ||
      className.includes('input') ||
      className.includes('prompt') ||
      id.includes('chat') ||
      id.includes('input')
    );
  }

  private findNearbySendButton(element: HTMLElement, root: Document | ShadowRoot): HTMLElement | null {
    const parent = element.closest('form, div[class*="input"], div[class*="chat"]');
    
    if (parent) {
      const sendButtons = parent.querySelectorAll(
        'button[type="submit"], button[aria-label*="send"], ' +
        '[data-testid*="send"], [class*="send-button"]'
      );
      
      for (const btn of Array.from(sendButtons)) {
        const htmlBtn = btn as HTMLElement;
        if (this.isSendButton(htmlBtn)) {
          return htmlBtn;
        }
      }
    }
    
    return null;
  }

  private isSendButton(element: HTMLElement): boolean {
    const type = element.getAttribute('type')?.toLowerCase() || '';
    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
    const className = element.className?.toLowerCase() || '';
    
    return (
      type === 'submit' ||
      ariaLabel.includes('send') ||
      ariaLabel.includes('submit') ||
      className.includes('send')
    );
  }
}

/**
 * DetectionManager - Orchestrates detection strategies with performance optimizations
 * Uses Strategy Pattern for extensible, site-agnostic detection
 * 
 * Performance Features:
 * - 10fps throttling (100ms intervals) to prevent main thread congestion
 * - Page visibility API to skip detection on hidden tabs
 * - Shadow DOM scanning for inputs in shadow roots
 * - Cache with TTL for detected inputs
 * - performance.mark() for profiling detection cycles
 */
export class DetectionManager {
  private strategies: DetectionStrategy[];
  private detectedInputs: Map<string, InputDetectionResult>;
  private observer: MutationObserver | null;
  private lastDetectionTime: number;
  private readonly DETECTION_INTERVAL_MS = 100; // 10fps throttle
  private shadowRootCache: Set<ShadowRoot>;

  constructor() {
    this.strategies = [
      new AriaTextboxStrategy(),
      new TextareaStrategy(),
      new ContentEditableStrategy(),
    ];
    this.detectedInputs = new Map();
    this.observer = null;
    this.lastDetectionTime = 0;
    this.shadowRootCache = new Set();
  }

  /**
   * Detect chat inputs in the given root context
   * Returns all detected inputs with their confidence scores
   * Includes both light DOM and shadow DOM scanning
   */
  detect(root: Document | ShadowRoot = document): InputDetectionResult[] {
    const markId = `glint-detection-${performance.now()}`;
    performance.mark(`${markId}-start`);
    
    const results: InputDetectionResult[] = [];

    // Scan light DOM (or provided root)
    for (const strategy of this.strategies) {
      try {
        const result = strategy.detect(root);
        if (result) {
          results.push(result);
          
          // Cache the result
          const key = this.getElementKey(result.element);
          this.detectedInputs.set(key, result);
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.name} failed:`, error);
      }
    }

    // Scan shadow DOM for additional inputs
    const shadowResults = this.scanShadowRoots(root);
    results.push(...shadowResults);

    // Sort by confidence (highest first)
    const sortedResults = results.sort((a, b) => b.confidence - a.confidence);

    performance.mark(`${markId}-end`);
    performance.measure(`glint-detection`, `${markId}-start`, `${markId}-end`);

    return sortedResults;
  }

  /**
   * Recursively scan shadow DOM for input elements
   * Caches shadow root references to avoid repeated queries
   */
  private scanShadowRoots(root: Document | ShadowRoot): InputDetectionResult[] {
    const results: InputDetectionResult[] = [];
    const hostElements = root.querySelectorAll('*');
    
    for (const host of Array.from(hostElements)) {
      const shadowRoot = (host as HTMLElement).shadowRoot;
      if (shadowRoot && !this.shadowRootCache.has(shadowRoot)) {
        this.shadowRootCache.add(shadowRoot);
        
        // Apply all strategies to shadow DOM
        for (const strategy of this.strategies) {
          try {
            const result = strategy.detect(shadowRoot);
            if (result) {
              results.push(result);
              
              // Cache the result
              const key = this.getElementKey(result.element);
              this.detectedInputs.set(key, result);
            }
          } catch (error) {
            console.warn(`Strategy ${strategy.name} failed in shadow DOM:`, error);
          }
        }
        
        // Recursively scan nested shadow roots
        const nestedResults = this.scanShadowRoots(shadowRoot);
        results.push(...nestedResults);
      }
    }
    
    return results;
  }

  /**
   * Check if detection should run based on throttle interval
   */
  private shouldDetect(): boolean {
    const now = performance.now();
    if (now - this.lastDetectionTime < this.DETECTION_INTERVAL_MS) {
      return false;
    }
    this.lastDetectionTime = now;
    return true;
  }

  /**
   * Start observing DOM changes for dynamic input detection
   * Includes page visibility check to skip detection on hidden tabs
   */
  observe(root: Document | ShadowRoot = document): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      // Skip detection if tab is not visible
      if (document.hidden) {
        return;
      }

      let shouldRedetect = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldRedetect = true;
          break;
        }
      }

      if (shouldRedetect && this.shouldDetect()) {
        this.detect(root);
      }
    });

    this.observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'contenteditable', 'class', 'id'],
    });
  }

  /**
   * Stop observing DOM changes
   */
  unobserve(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Get cached detection result for an element
   */
  getCached(element: HTMLElement): InputDetectionResult | null {
    const key = this.getElementKey(element);
    return this.detectedInputs.get(key) || null;
  }

  /**
   * Clear cached results
   */
  clearCache(): void {
    this.detectedInputs.clear();
  }

  /**
   * Add a custom detection strategy
   */
  addStrategy(strategy: DetectionStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Remove a detection strategy by name
   */
  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter((s) => s.name !== name);
  }

  /**
   * Get all registered strategy names
   */
  getStrategyNames(): string[] {
    return this.strategies.map((s) => s.name);
  }

  /**
   * Generate a unique key for an element
   */
  private getElementKey(element: HTMLElement): string {
    if (element.id) {
      return `id:${element.id}`;
    }
    
    const className = element.className || '';
    const tagName = element.tagName;
    const ariaLabel = element.getAttribute('aria-label') || '';
    
    return `hash:${this.hashCode(`${tagName}-${className}-${ariaLabel}`)}`;
  }

  /**
   * Simple hash function for generating keys
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instance for convenience
export const detectionManager = new DetectionManager();

/**
 * Glint - Gemini Site Adapter
 * Extends DetectionManager with Gemini-specific detection logic
 */

import type { DetectionStrategy, InputDetectionResult } from '../../core/engine/DetectionManager';

/**
 * Gemini-specific detection strategy
 * Targets Gemini's unique DOM structure and ARIA patterns
 */
export class GeminiStrategy implements DetectionStrategy {
  readonly name = 'gemini';

  detect(root: Document | ShadowRoot): InputDetectionResult | null {
    // Primary: Look for Gemini's textarea with specific attributes
    const primarySelector = 'textarea[aria-label*="input"], textarea[placeholder*="message"]';
    const elements = root.querySelectorAll(primarySelector);

    for (const el of Array.from(elements)) {
      const htmlEl = el as HTMLTextAreaElement;
      
      if (!htmlEl.disabled && !htmlEl.hidden) {
        const sendButton = this.findSendButton(root);
        
        return {
          element: htmlEl,
          strategy: this.name,
          confidence: 0.96,
          metadata: {
            ariaRole: htmlEl.getAttribute('role') || undefined,
            isContentEditable: true,
            placeholder: htmlEl.placeholder || undefined,
            nearbySendButton: sendButton,
          },
        };
      }
    }

    // Fallback: Look for contenteditable in Gemini's input area
    const containerSelector = 'main form, div[class*="input-area"], div[class*="composer"]';
    const containers = root.querySelectorAll(containerSelector);

    for (const container of Array.from(containers)) {
      const editable = container.querySelector('[contenteditable="true"], textarea');
      if (editable) {
        const sendButton = this.findSendButton(root);
        
        return {
          element: editable as HTMLElement,
          strategy: this.name,
          confidence: 0.88,
          metadata: {
            ariaRole: editable.getAttribute('role') || undefined,
            isContentEditable: editable.isContentEditable,
            placeholder: editable.getAttribute('placeholder') || undefined,
            nearbySendButton: sendButton,
          },
        };
      }
    }

    // Last fallback: role="textbox" near a form
    const textboxElements = root.querySelectorAll('form [role="textbox"]');
    for (const el of Array.from(textboxElements)) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.isContentEditable || htmlEl.tagName === 'TEXTAREA') {
        const sendButton = this.findSendButton(root);
        
        return {
          element: htmlEl,
          strategy: this.name,
          confidence: 0.82,
          metadata: {
            ariaRole: 'textbox',
            isContentEditable: htmlEl.isContentEditable,
            placeholder: htmlEl.getAttribute('placeholder') || undefined,
            nearbySendButton: sendButton,
          },
        };
      }
    }

    return null;
  }

  /**
   * Find Gemini's send button
   */
  private findSendButton(root: Document | ShadowRoot): HTMLElement | null {
    // Gemini uses a paper plane icon or arrow
    const selectors = [
      'button[aria-label*="send"]',
      'button[aria-label*="submit"]',
      'button svg',
      '[class*="send-button"]',
      '[data-testid*="send"]',
      'form button[type="submit"]',
    ];

    for (const selector of selectors) {
      const buttons = root.querySelectorAll(selector);
      for (const btn of Array.from(buttons)) {
        const htmlBtn = btn as HTMLElement;
        if (this.isValidSendButton(htmlBtn)) {
          return htmlBtn;
        }
      }
    }

    return null;
  }

  /**
   * Validate if element is a valid send button
   */
  private isValidSendButton(element: HTMLElement): boolean {
    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
    const className = element.className?.toLowerCase() || '';
    const tagName = element.tagName.toLowerCase();
    const parentForm = element.closest('form');

    // Check for send/submit indicators
    if (
      ariaLabel.includes('send') ||
      ariaLabel.includes('submit') ||
      className.includes('send')
    ) {
      return true;
    }

    // SVG icons inside button within a form (typical Gemini pattern)
    if (tagName === 'svg' && parentForm) {
      return true;
    }

    // Submit button in form
    if (parentForm && element.getAttribute('type') === 'submit') {
      return true;
    }

    return false;
  }
}

/**
 * Helper to check if current site is Gemini
 */
export function isGeminiSite(hostname: string): boolean {
  return hostname.includes('gemini.google.com') || hostname.includes('google.com') && hostname.includes('gemini');
}

/**
 * Get Gemini-specific selectors for remote adapter
 */
export function getGeminiSelectors(): {
  inputSelector: string;
  sendButtonSelector: string;
  containerSelector: string;
} {
  return {
    inputSelector: 'textarea[aria-label*="input"], [contenteditable="true"], [role="textbox"]',
    sendButtonSelector: 'button[aria-label*="send"], button svg, form button[type="submit"]',
    containerSelector: 'main form, div[class*="input-area"]',
  };
}

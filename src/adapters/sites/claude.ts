/**
 * Glint - Claude Site Adapter
 * Extends DetectionManager with Claude-specific detection logic
 */

import type { DetectionStrategy, InputDetectionResult } from '../../core/engine/DetectionManager';

/**
 * Claude-specific detection strategy
 * Targets Claude's unique DOM structure and ARIA patterns
 */
export class ClaudeStrategy implements DetectionStrategy {
  readonly name = 'claude';

  detect(root: Document | ShadowRoot): InputDetectionResult | null {
    // Primary: Look for Claude's contenteditable div with specific attributes
    const primarySelector = 'div[contenteditable="true"][data-testid="chat-input"]';
    const elements = root.querySelectorAll(primarySelector);

    for (const el of Array.from(elements)) {
      const htmlEl = el as HTMLElement;
      
      if (!htmlEl.hasAttribute('disabled') && !htmlEl.hasAttribute('hidden')) {
        const sendButton = this.findSendButton(root);
        
        return {
          element: htmlEl,
          strategy: this.name,
          confidence: 0.98,
          metadata: {
            ariaRole: htmlEl.getAttribute('role') || undefined,
            isContentEditable: true,
            placeholder: htmlEl.getAttribute('placeholder') || undefined,
            nearbySendButton: sendButton,
          },
        };
      }
    }

    // Fallback: Look for any contenteditable in Claude's input container
    const containerSelector = 'div[class*="input-container"], form';
    const containers = root.querySelectorAll(containerSelector);

    for (const container of Array.from(containers)) {
      const editable = container.querySelector('[contenteditable="true"]');
      if (editable) {
        const sendButton = this.findSendButton(root);
        
        return {
          element: editable as HTMLElement,
          strategy: this.name,
          confidence: 0.90,
          metadata: {
            ariaRole: editable.getAttribute('role') || undefined,
            isContentEditable: true,
            placeholder: editable.getAttribute('placeholder') || undefined,
            nearbySendButton: sendButton,
          },
        };
      }
    }

    // Last fallback: role="textbox"
    const textboxElements = root.querySelectorAll('[role="textbox"]');
    for (const el of Array.from(textboxElements)) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.isContentEditable) {
        const sendButton = this.findSendButton(root);
        
        return {
          element: htmlEl,
          strategy: this.name,
          confidence: 0.85,
          metadata: {
            ariaRole: 'textbox',
            isContentEditable: true,
            placeholder: htmlEl.getAttribute('placeholder') || undefined,
            nearbySendButton: sendButton,
          },
        };
      }
    }

    return null;
  }

  /**
   * Find Claude's send button
   */
  private findSendButton(root: Document | ShadowRoot): HTMLElement | null {
    // Claude uses SVG icons for send button
    const selectors = [
      'button[aria-label*="send"]',
      'button[aria-label*="submit"]',
      'button svg[path*="arrow"]',
      'button svg[path*="plane"]',
      '[class*="send-button"]',
      '[data-testid*="send"]',
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

    // Check for send/submit indicators
    if (
      ariaLabel.includes('send') ||
      ariaLabel.includes('submit') ||
      className.includes('send')
    ) {
      return true;
    }

    // SVG icons inside button
    if (tagName === 'svg' && element.parentElement?.tagName.toLowerCase() === 'button') {
      return true;
    }

    return false;
  }
}

/**
 * Helper to check if current site is Claude
 */
export function isClaudeSite(hostname: string): boolean {
  return hostname.includes('claude.ai') || hostname.includes('claude.com');
}

/**
 * Get Claude-specific selectors for remote adapter
 */
export function getClaudeSelectors(): {
  inputSelector: string;
  sendButtonSelector: string;
  containerSelector: string;
} {
  return {
    inputSelector: 'div[contenteditable="true"][data-testid="chat-input"], [role="textbox"]',
    sendButtonSelector: 'button[aria-label*="send"], button svg[path*="arrow"]',
    containerSelector: 'div[class*="input-container"], form',
  };
}

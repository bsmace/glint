/**
 * Glint - ChatGPT Site Adapter
 * Extends DetectionManager with ChatGPT-specific detection logic
 */

import type { DetectionStrategy, InputDetectionResult } from '../../core/engine/DetectionManager';

/**
 * ChatGPT-specific detection strategy
 * Targets ChatGPT's unique DOM structure and ARIA patterns
 */
export class ChatGPTStrategy implements DetectionStrategy {
  readonly name = 'chatgpt';

  detect(root: Document | ShadowRoot): InputDetectionResult | null {
    // Primary: Look for ChatGPT's main textarea with data-testid
    const primarySelector = 'textarea[data-testid="chat-input"]';
    const elements = root.querySelectorAll(primarySelector);

    for (const el of Array.from(elements)) {
      const htmlEl = el as HTMLTextAreaElement;
      
      if (!htmlEl.disabled && !htmlEl.hidden) {
        const sendButton = this.findSendButton(root);
        
        return {
          element: htmlEl,
          strategy: this.name,
          confidence: 0.98,
          metadata: {
            ariaRole: htmlEl.getAttribute('role') || undefined,
            isContentEditable: true,
            placeholder: htmlEl.placeholder || undefined,
            nearbySendButton: sendButton,
          },
        };
      }
    }

    // Fallback: Look for form with ChatGPT-specific attributes
    const formSelector = 'form.stretch.laundry-border';
    const forms = root.querySelectorAll(formSelector);

    for (const form of Array.from(forms)) {
      const textarea = form.querySelector('textarea');
      if (textarea && !textarea.disabled) {
        const sendButton = this.findSendButton(root);
        
        return {
          element: textarea as HTMLTextAreaElement,
          strategy: this.name,
          confidence: 0.92,
          metadata: {
            ariaRole: textarea.getAttribute('role') || undefined,
            isContentEditable: true,
            placeholder: textarea.placeholder || undefined,
            nearbySendButton: sendButton,
          },
        };
      }
    }

    return null;
  }

  /**
   * Find ChatGPT's send button
   */
  private findSendButton(root: Document | ShadowRoot): HTMLElement | null {
    // ChatGPT uses a specific button structure
    const selectors = [
      'button[data-testid="send-button"]',
      'form button[type="submit"]',
      'button[aria-label*="send"]',
      'div[class*="send-button"]',
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

    // SVG icons (paper plane)
    if (tagName === 'svg') {
      return true;
    }

    return false;
  }
}

/**
 * Helper to check if current site is ChatGPT
 */
export function isChatGPTSite(hostname: string): boolean {
  return hostname.includes('chat.openai.com') || hostname.includes('openai.com');
}

/**
 * Get ChatGPT-specific selectors for remote adapter
 */
export function getChatGPTSelectors(): {
  inputSelector: string;
  sendButtonSelector: string;
  containerSelector: string;
} {
  return {
    inputSelector: 'textarea[data-testid="chat-input"], form.stretch.laundry-border textarea',
    sendButtonSelector: 'button[data-testid="send-button"], form button[type="submit"]',
    containerSelector: 'form.stretch.laundry-border',
  };
}

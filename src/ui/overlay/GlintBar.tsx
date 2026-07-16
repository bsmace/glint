/** @jsxImportSource preact */
import { signal } from '@preact/signals-core';
import { render, h } from 'preact';
import { workerBridge } from '../../lib/ai/workerBridge';
import { validateAIResponse, validateCharacterCount } from '../../lib/ai/schema';
import { injectStyles } from '../styles/holographic';

/**
 * UI State Signals
 */
const isVisible = signal(false);
const isProcessing = signal(false);
const activeMode = signal<'improve' | 'concise' | 'context' | 'format' | null>(null);
const lastError = signal<string | null>(null);
const characterCount = signal(0);
const originalText = signal('');
const improvedText = signal('');
const pendingChange = signal(false);

const CHARACTER_LIMIT = 2500;

/**
 * GlintBar Component - Holographic UI for prompt enhancement
 */
export class GlintBar {
  private host: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private anchorElement: HTMLElement | null = null;
  private detectedInput: HTMLElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private inputListener: ((e: Event) => void) | null = null;

  /**
   * Initialize the GlintBar
   */
  async initialize(): Promise<void> {
    // Create closed Shadow DOM container
    this.host = document.createElement('div');
    this.host.className = 'glint-host';
    this.host.style.all = 'initial';
    this.host.style.position = 'fixed';
    this.host.style.top = '0';
    this.host.style.left = '0';
    this.host.style.width = '0';
    this.host.style.height = '0';
    this.host.style.zIndex = '2147483647';
    this.host.style.pointerEvents = 'none';

    this.shadowRoot = this.host.attachShadow({ mode: 'closed' });

    // Inject holographic styles
    injectStyles(this.shadowRoot);

    // Render initial UI
    this.render();

    // Attach to document
    document.body.appendChild(this.host);

    // Connect to worker
    await workerBridge.connect();

    console.log('[Glint] GlintBar initialized');
  }

  /**
   * Attach to a detected input element
   */
  attachToInput(inputElement: HTMLElement): void {
    this.detectedInput = inputElement;
    this.anchorElement = inputElement;

    // Set up CSS anchor positioning
    if (this.anchorElement) {
      this.anchorElement.style.anchorName = '--glint-anchor';
    }

    // Update character count
    this.updateCharacterCount();

    // Listen for input changes
    this.setupInputListener();

    // Show the bar
    this.show();
  }

  /**
   * Detach from current input
   */
  detach(): void {
    this.hide();
    this.cleanupInputListener();
    this.detectedInput = null;
    this.anchorElement = null;
    originalText.value = '';
    improvedText.value = '';
    pendingChange.value = false;
  }

  /**
   * Show the GlintBar
   */
  show(): void {
    if (this.shadowRoot) {
      const bar = this.shadowRoot.querySelector('.glint-bar') as HTMLElement;
      if (bar) {
        bar.showPopover?.();
        isVisible.value = true;
      }
    }
  }

  /**
   * Hide the GlintBar
   */
  hide(): void {
    if (this.shadowRoot) {
      const bar = this.shadowRoot.querySelector('.glint-bar') as HTMLElement;
      if (bar) {
        bar.hidePopover?.();
        isVisible.value = false;
      }
    }
  }

  /**
   * Set up input event listener
   */
  private setupInputListener(): void {
    if (!this.detectedInput) return;

    this.inputListener = () => {
      this.updateCharacterCount();
      
      // Hide pending changes when user edits
      if (pendingChange.value) {
        pendingChange.value = false;
        improvedText.value = '';
      }
    };

    this.detectedInput.addEventListener('input', this.inputListener);
  }

  /**
   * Clean up input event listener
   */
  private cleanupInputListener(): void {
    if (this.detectedInput && this.inputListener) {
      this.detectedInput.removeEventListener('input', this.inputListener);
      this.inputListener = null;
    }
  }

  /**
   * Update character count
   */
  private updateCharacterCount(): void {
    if (!this.detectedInput) return;

    const text = this.getTextFromInput(this.detectedInput);
    characterCount.value = text.length;
  }

  /**
   * Get text from input element (handles contenteditable, textarea, etc.)
   */
  private getTextFromInput(element: HTMLElement): string {
    if (element.tagName === 'TEXTAREA') {
      return (element as HTMLTextAreaElement).value;
    } else if (element.isContentEditable) {
      return element.textContent || '';
    } else {
      return element.getAttribute('value') || '';
    }
  }

  /**
   * Set text in input element
   */
  private setTextInInput(element: HTMLElement, text: string): void {
    if (element.tagName === 'TEXTAREA') {
      (element as HTMLTextAreaElement).value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element.isContentEditable) {
      element.textContent = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * Handle chip click - improve prompt
   */
  private async handleImprove(mode: 'improve' | 'concise' | 'context' | 'format'): Promise<void> {
    if (!this.detectedInput || isProcessing.value) return;

    const currentText = this.getTextFromInput(this.detectedInput);
    
    if (!currentText.trim()) {
      lastError.value = 'Please enter some text first';
      return;
    }

    isProcessing.value = true;
    activeMode.value = mode;
    lastError.value = null;

    try {
      // Store original text for undo
      originalText.value = currentText;

      // Call AI worker
      const response = await workerBridge.improvePrompt(currentText, mode);
      const validated = validateAIResponse(response);

      if (validated.success && validated.result) {
        improvedText.value = validated.result;
        pendingChange.value = true;
        
        // Apply with View Transition for smooth morph effect
        this.applyChangeWithTransition(validated.result);
      } else {
        lastError.value = validated.error || 'Failed to improve prompt';
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      isProcessing.value = false;
      activeMode.value = null;
    }
  }

  /**
   * Apply change with View Transition API for smooth animation
   */
  private applyChangeWithTransition(newText: string): void {
    if (!this.detectedInput) return;

    // Use View Transition API if available
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        this.setTextInInput(this.detectedInput, newText);
      });
    } else {
      this.setTextInInput(this.detectedInput, newText);
    }
  }

  /**
   * Accept the current change
   */
  private handleAccept(): void {
    pendingChange.value = false;
    originalText.value = '';
  }

  /**
   * Undo the current change
   */
  private handleUndo(): void {
    if (!this.detectedInput || !originalText.value) return;

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        this.setTextInInput(this.detectedInput, originalText.value);
      });
    } else {
      this.setTextInInput(this.detectedInput, originalText.value);
    }

    pendingChange.value = false;
    improvedText.value = '';
    originalText.value = '';
  }

  /**
   * Render the UI
   */
  private render(): void {
    if (!this.shadowRoot) return;

    const vnode = h('div', { 
      className: 'glint-bar glint-glass',
      popover: 'manual'
    }, [
      // Action Chips
      h('button', {
        className: `glint-chip glint-chip--primary ${isProcessing.value ? 'glint-chip--processing' : ''}`,
        onClick: () => this.handleImprove('improve'),
        disabled: isProcessing.value,
      }, [
        h('span', { className: 'glint-chip-icon' }, '✨'),
        h('span', {}, 'Improve'),
      ]),

      h('button', {
        className: `glint-chip ${isProcessing.value ? 'glint-chip--processing' : ''}`,
        onClick: () => this.handleImprove('concise'),
        disabled: isProcessing.value,
      }, [
        h('span', { className: 'glint-chip-icon' }, '📝'),
        h('span', {}, 'Concise'),
      ]),

      h('button', {
        className: `glint-chip ${isProcessing.value ? 'glint-chip--processing' : ''}`,
        onClick: () => this.handleImprove('context'),
        disabled: isProcessing.value,
      }, [
        h('span', { className: 'glint-chip-icon' }, '🎯'),
        h('span', {}, 'Context'),
      ]),

      h('button', {
        className: `glint-chip ${isProcessing.value ? 'glint-chip--processing' : ''}`,
        onClick: () => this.handleImprove('format'),
        disabled: isProcessing.value,
      }, [
        h('span', { className: 'glint-chip-icon' }, '📋'),
        h('span', {}, 'Format'),
      ]),

      // Divider
      h('div', { className: 'glint-divider' }),

      // Accept/Undo chips (shown when there's a pending change)
      pendingChange.value && h('button', {
        className: 'glint-chip glint-chip--accept',
        onClick: () => this.handleAccept(),
      }, [
        h('span', { className: 'glint-chip-icon' }, '✓'),
        h('span', {}, 'Accept'),
      ]),

      pendingChange.value && h('button', {
        className: 'glint-chip glint-chip--undo',
        onClick: () => this.handleUndo(),
      }, [
        h('span', { className: 'glint-chip-icon' }, '↶'),
        h('span', {}, 'Undo'),
      ]),

      // Character Counter
      h('div', {
        className: `glint-char-counter ${this.getCharacterCountClass()}`,
      }, [
        h('span', {}, `${characterCount.value}/${CHARACTER_LIMIT}`),
      ]),

      // Privacy Badge
      h('div', { className: 'glint-privacy-badge' }, [
        h('span', { className: 'glint-privacy-badge-icon' }, '🔒'),
        h('span', {}, 'On-device'),
      ]),

      // Error message (if any)
      lastError.value && h('div', {
        className: 'glint-error',
        style: {
          position: 'absolute',
          bottom: '100%',
          left: '0',
          right: '0',
          padding: '8px 12px',
          marginBottom: '8px',
          background: 'rgba(239, 68, 68, 0.9)',
          borderRadius: '8px',
          fontSize: '12px',
          textAlign: 'center',
        },
      }, [
        h('span', {}, lastError.value),
      ]),
    ]);

    render(vnode, this.shadowRoot);
  }

  /**
   * Get character count CSS class based on limit
   */
  private getCharacterCountClass(): string {
    const count = characterCount.value;
    const validation = validateCharacterCount(count, CHARACTER_LIMIT);

    if (validation.isOverLimit) {
      return 'glint-char-counter--error';
    } else if (count > CHARACTER_LIMIT * 0.9) {
      return 'glint-char-counter--warning';
    }
    return '';
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cleanupInputListener();
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
    this.host = null;
    this.shadowRoot = null;
  }
}

// Singleton instance
export const glintBar = new GlintBar();

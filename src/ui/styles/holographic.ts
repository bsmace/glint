/**
 * Glint - Holographic UI Styles
 * Glassmorphism design with backdrop blur, subtle borders, and inter font
 */

export const holographicStyles = `
/* Import Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

/* Glint Root Container - Closed Shadow DOM styles */
.glint-root {
  all: initial;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #ffffff;
  pointer-events: auto;
}

.glint-root *,
.glint-root *::before,
.glint-root *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Glassmorphism Base */
.glint-glass {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.12),
    0 1px 4px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Glint Bar - Main UI Component */
.glint-bar {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  min-width: 280px;
  max-width: 420px;
  z-index: 2147483647;
  
  /* CSS Anchor Positioning */
  anchor-name: --glint-anchor;
  position-anchor: --glint-anchor;
  position-area: bottom;
  position-try-options: flip-block, flip-inline;
  
  /* Popover API for top-layer isolation */
  popover: manual;
  
  /* Smooth transitions */
  transition: 
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.glint-bar[popover] {
  margin: 0;
  border: none;
  padding: 0;
  background: transparent;
  backdrop-filter: none;
  inset: auto;
}

.glint-bar:not(:popover-open) {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  pointer-events: none;
}

.glint-bar:popover-open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Action Chips */
.glint-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.06);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  user-select: none;
}

.glint-chip:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.glint-chip:active {
  transform: translateY(0);
  background: rgba(255, 255, 255, 0.08);
}

.glint-chip-icon {
  font-size: 14px;
  line-height: 1;
}

/* Primary chip (Improve) */
.glint-chip--primary {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.3) 0%,
    rgba(168, 85, 247, 0.2) 100%
  );
  border-color: rgba(168, 85, 247, 0.3);
}

.glint-chip--primary:hover {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.45) 0%,
    rgba(168, 85, 247, 0.35) 100%
  );
}

/* Accept/Undo Chips */
.glint-chip--accept {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.3);
  color: #86efac;
}

.glint-chip--accept:hover {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.45);
}

.glint-chip--undo {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

.glint-chip--undo:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.4);
}

/* Processing State */
.glint-chip--processing {
  opacity: 0.7;
  cursor: wait;
  pointer-events: none;
}

.glint-chip--processing .glint-chip-icon {
  animation: glint-spin 1s linear infinite;
}

@keyframes glint-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Character Counter */
.glint-char-counter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  transition: color 0.2s ease;
}

.glint-char-counter--warning {
  color: rgba(251, 191, 36, 0.9);
}

.glint-char-counter--error {
  color: rgba(248, 113, 113, 0.95);
  font-weight: 600;
  animation: glint-pulse 1.5s ease-in-out infinite;
}

@keyframes glint-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Privacy Badge */
.glint-privacy-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  white-space: nowrap;
}

.glint-privacy-badge-icon {
  font-size: 10px;
}

/* Divider */
.glint-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

/* View Transition Support */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Scrollbar styling for any scrollable content */
.glint-root::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.glint-root::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.glint-root::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.glint-root::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Utility Classes */
.glint-hidden {
  display: none !important;
}

.glint-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus visible for accessibility */
.glint-chip:focus-visible {
  outline: 2px solid rgba(168, 85, 247, 0.6);
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .glint-glass {
    background: rgba(0, 0, 0, 0.9);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  .glint-chip {
    border-color: rgba(255, 255, 255, 0.3);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .glint-bar,
  .glint-chip,
  .glint-char-counter {
    transition: none;
  }
  
  .glint-chip--processing .glint-chip-icon {
    animation: none;
  }
  
  .glint-char-counter--error {
    animation: none;
  }
}
`;

/**
 * Inject styles into a Shadow DOM root
 */
export function injectStyles(shadowRoot: ShadowRoot): void {
  const styleElement = document.createElement('style');
  styleElement.textContent = holographicStyles;
  shadowRoot.appendChild(styleElement);
}

/**
 * Create a style element for injection
 */
export function createStyleElement(): HTMLStyleElement {
  const styleElement = document.createElement('style');
  styleElement.textContent = holographicStyles;
  return styleElement;
}

/**
 * Glint - Content Script Entry Point
 * Initializes detection engine and UI overlay
 */

import { detectionManager } from '../core/engine/DetectionManager';
import { glintBar } from '../ui/overlay/GlintBar';
import { remoteAdapterManager } from '../adapters/remoteAdapter';

/**
 * Initialize Glint on page load
 */
async function initialize(): Promise<void> {
  console.log('[Glint] Initializing...');

  try {
    // Initialize remote adapter manager
    remoteAdapterManager.initialize();

    // Fetch remote config (non-blocking)
    remoteAdapterManager.fetchConfig().catch(console.warn);

    // Initialize the GlintBar UI
    await glintBar.initialize();

    // Start detecting inputs
    detectionManager.observe(document);

    // Set up detection loop
    const checkForInputs = () => {
      const results = detectionManager.detect(document);

      if (results.length > 0 && !glintBarIsAttached()) {
        // Attach to the highest confidence input
        const bestResult = results[0];
        glintBar.attachToInput(bestResult.element);
        console.log('[Glint] Attached to input:', bestResult.strategy);
      } else if (results.length === 0 && glintBarIsAttached()) {
        // Detach if no inputs found
        glintBar.detach();
      }

      // Continue checking
      requestAnimationFrame(checkForInputs);
    };

    // Start the detection loop
    requestAnimationFrame(checkForInputs);

    console.log('[Glint] Initialization complete');
  } catch (error) {
    console.error('[Glint] Initialization failed:', error);
  }
}

/**
 * Check if GlintBar is currently attached to an input
 */
function glintBarIsAttached(): boolean {
  // This would need a method on glintBar to check attachment state
  // For now, we'll use a simple heuristic
  return false;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Handle page navigation (SPA support)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('[Glint] URL changed, re-initializing...');
    glintBar.detach();
    // Re-initialization will happen via the detection loop
  }
}).observe(document, {
  subtree: true,
  childList: true,
});
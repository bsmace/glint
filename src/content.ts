/**
 * Glint - Content Script Entry Point
 * Initializes detection engine and UI overlay
 */

import { detectionManager } from './core/engine/DetectionManager';
import { glintBar } from './ui/overlay/GlintBar';
import { remoteAdapterManager } from './adapters/remoteAdapter';
import {
  ChatGPTStrategy,
  ClaudeStrategy,
  GeminiStrategy,
  isChatGPTSite,
  isClaudeSite,
  isGeminiSite,
} from './adapters/sites';

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

    // Register site-specific strategies based on hostname
    registerSiteStrategies();

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
 * Register site-specific detection strategies based on current hostname
 */
function registerSiteStrategies(): void {
  const hostname = window.location.hostname;

  // Remove any existing site-specific strategies to prevent duplicates
  detectionManager.removeStrategy('chatgpt');
  detectionManager.removeStrategy('claude');
  detectionManager.removeStrategy('gemini');

  if (isChatGPTSite(hostname)) {
    detectionManager.addStrategy(new ChatGPTStrategy());
    console.log('[Glint] Registered ChatGPT strategy');
  } else if (isClaudeSite(hostname)) {
    detectionManager.addStrategy(new ClaudeStrategy());
    console.log('[Glint] Registered Claude strategy');
  } else if (isGeminiSite(hostname)) {
    detectionManager.addStrategy(new GeminiStrategy());
    console.log('[Glint] Registered Gemini strategy');
  } else {
    console.log('[Glint] Using generic detection strategies for', hostname);
  }
}

/**
 * Check if GlintBar is currently attached to an input
 */
function glintBarIsAttached(): boolean {
  // Delegate to GlintBar instance for accurate attachment state
  return glintBar.isAttached();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Handle page navigation (SPA support)
let lastUrl = location.href;
let lastHostname = location.hostname;
new MutationObserver(() => {
  const url = location.href;
  const hostname = location.hostname;
  if (url !== lastUrl || hostname !== lastHostname) {
    lastUrl = url;
    lastHostname = hostname;
    console.log('[Glint] URL/hostname changed, re-initializing...');
    glintBar.detach();
    // Re-register strategies for new site
    detectionManager.clearCache();
    registerSiteStrategies();
    // Re-initialization will happen via the detection loop
  }
}).observe(document, {
  subtree: true,
  childList: true,
});
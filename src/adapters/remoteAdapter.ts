/**
 * Glint - Remote Adapter for Dynamic Site Selector Updates
 * Fetches JSON config from URL to update detection selectors without extension updates
 */

import { z } from 'zod';
import { validateRemoteAdapterConfig, type RemoteAdapterConfig } from '../ai/schema';

/**
 * Default adapter configuration for known sites
 */
const DEFAULT_ADAPTERS: RemoteAdapterConfig = {
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  selectors: {
    'chat.openai.com': {
      inputSelector: '[role="textbox"]',
      sendButtonSelector: 'button[data-testid*="send"], button[aria-label*="send"]',
      containerSelector: 'form',
    },
    'claude.ai': {
      inputSelector: '[role="textbox"], div[contenteditable="true"]',
      sendButtonSelector: 'button[aria-label*="send"], button svg[path*="arrow"]',
      containerSelector: 'form, div[class*="input"]',
    },
    'gemini.google.com': {
      inputSelector: '[role="textbox"], textarea',
      sendButtonSelector: 'button[aria-label*="send"], button svg',
      containerSelector: 'form',
    },
  },
};

/**
 * RemoteAdapterManager - Handles fetching and applying remote selector configs
 */
export class RemoteAdapterManager {
  private config: RemoteAdapterConfig | null = null;
  private lastFetchTime: number = 0;
  private fetchInterval: number = 5 * 60 * 1000; // 5 minutes
  private remoteUrl: string | null = null;
  private isLoading = false;

  /**
   * Initialize with optional remote config URL
   */
  initialize(remoteConfigUrl?: string): void {
    this.remoteUrl = remoteConfigUrl || null;
    this.config = { ...DEFAULT_ADAPTERS };
    console.log('[Glint] RemoteAdapterManager initialized');
  }

  /**
   * Fetch remote configuration
   */
  async fetchConfig(): Promise<boolean> {
    if (!this.remoteUrl || this.isLoading) {
      return false;
    }

    // Check if we need to fetch (respect interval)
    const now = Date.now();
    if (now - this.lastFetchTime < this.fetchInterval) {
      return false;
    }

    this.isLoading = true;

    try {
      const response = await fetch(this.remoteUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.config = validateRemoteAdapterConfig(data);
      this.lastFetchTime = now;

      console.log('[Glint] Remote config fetched successfully:', this.config.version);
      return true;
    } catch (error) {
      console.warn('[Glint] Failed to fetch remote config:', error);
      // Fall back to defaults
      this.config = { ...DEFAULT_ADAPTERS };
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Get selector config for a specific site
   */
  getSelectorsForSite(hostname: string): {
    inputSelector: string;
    sendButtonSelector: string;
    containerSelector?: string;
  } | null {
    if (!this.config) {
      return null;
    }

    // Try exact match first
    if (this.config.selectors[hostname]) {
      return this.config.selectors[hostname];
    }

    // Try partial match (e.g., subdomain.chat.openai.com -> chat.openai.com)
    for (const [domain, selectors] of Object.entries(this.config.selectors)) {
      if (hostname.includes(domain)) {
        return selectors;
      }
    }

    return null;
  }

  /**
   * Add or update a selector config
   */
  addSelector(
    hostname: string,
    selectors: {
      inputSelector: string;
      sendButtonSelector: string;
      containerSelector?: string;
    }
  ): void {
    if (!this.config) {
      this.config = { ...DEFAULT_ADAPTERS };
    }

    this.config.selectors[hostname] = selectors;
    console.log('[Glint] Added selector for:', hostname);
  }

  /**
   * Remove a selector config
   */
  removeSelector(hostname: string): void {
    if (this.config && this.config.selectors[hostname]) {
      delete this.config.selectors[hostname];
      console.log('[Glint] Removed selector for:', hostname);
    }
  }

  /**
   * Get current config version
   */
  getVersion(): string {
    return this.config?.version || 'unknown';
  }

  /**
   * Get last fetch time
   */
  getLastFetchTime(): number {
    return this.lastFetchTime;
  }

  /**
   * Force refresh config (ignores interval)
   */
  async forceRefresh(): Promise<boolean> {
    this.lastFetchTime = 0;
    return this.fetchConfig();
  }

  /**
   * Export current config as JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import config from JSON
   */
  importConfig(json: string): boolean {
    try {
      const data = JSON.parse(json);
      this.config = validateRemoteAdapterConfig(data);
      return true;
    } catch (error) {
      console.error('[Glint] Failed to import config:', error);
      return false;
    }
  }

  /**
   * Reset to default config
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_ADAPTERS };
    this.lastFetchTime = 0;
    console.log('[Glint] Reset to default config');
  }
}

// Singleton instance
export const remoteAdapterManager = new RemoteAdapterManager();

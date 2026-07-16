/**
 * Glint - Comlink Wrapper for SharedWorker Communication
 * Provides type-safe RPC communication with the AI worker
 */

import { wrap } from 'comlink';
import type { Remote } from 'comlink';
import type { AIResponse, PromptHistoryItem } from '../ai/schema';

/**
 * Worker API interface exposed via Comlink
 */
export interface WorkerAPI {
  initialize(): Promise<void>;
  improvePrompt(
    text: string,
    mode: 'improve' | 'concise' | 'context' | 'format'
  ): Promise<AIResponse>;
  searchHistory(query: string, limit?: number): Promise<PromptHistoryItem[]>;
  exportDatabase(): Promise<string>;
  importDatabase(stateJson: string): Promise<boolean>;
  getRecentHistory(limit?: number): Promise<PromptHistoryItem[]>;
}

/**
 * WorkerBridge - Manages SharedWorker connection and provides typed API
 */
export class WorkerBridge {
  private worker: SharedWorker | null = null;
  private remote: Remote<WorkerAPI> | null = null;
  private isConnected = false;
  private connectPromise: Promise<void> | null = null;

  /**
   * Initialize connection to SharedWorker
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      try {
        // Create SharedWorker connection
        this.worker = new SharedWorker(
          new URL('../worker/aiWorker.ts', import.meta.url),
          {
            name: 'glint-ai-worker',
            type: 'module',
          }
        );

        // Wrap with Comlink for RPC
        this.remote = wrap<WorkerAPI>(this.worker.port);

        // Initialize the worker
        await this.remote.initialize();

        this.isConnected = true;
        console.log('[Glint] Connected to SharedWorker');
      } catch (error) {
        console.error('[Glint] Failed to connect to SharedWorker:', error);
        throw error;
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  /**
   * Improve prompt using AI
   */
  async improvePrompt(
    text: string,
    mode: 'improve' | 'concise' | 'context' | 'format'
  ): Promise<AIResponse> {
    await this.ensureConnected();

    if (!this.remote) {
      return {
        success: false,
        error: 'Worker not connected',
      };
    }

    return this.remote.improvePrompt(text, mode);
  }

  /**
   * Search prompt history
   */
  async searchHistory(
    query: string,
    limit: number = 5
  ): Promise<PromptHistoryItem[]> {
    await this.ensureConnected();

    if (!this.remote) {
      return [];
    }

    return this.remote.searchHistory(query, limit);
  }

  /**
   * Get recent prompt history
   */
  async getRecentHistory(limit: number = 10): Promise<PromptHistoryItem[]> {
    await this.ensureConnected();

    if (!this.remote) {
      return [];
    }

    return this.remote.getRecentHistory(limit);
  }

  /**
   * Export database state
   */
  async exportDatabase(): Promise<string> {
    await this.ensureConnected();

    if (!this.remote) {
      return '';
    }

    return this.remote.exportDatabase();
  }

  /**
   * Import database state
   */
  async importDatabase(stateJson: string): Promise<boolean> {
    await this.ensureConnected();

    if (!this.remote) {
      return false;
    }

    return this.remote.importDatabase(stateJson);
  }

  /**
   * Disconnect from worker
   */
  disconnect(): void {
    if (this.worker) {
      this.worker.port.close();
      this.worker = null;
      this.remote = null;
      this.isConnected = false;
      console.log('[Glint] Disconnected from SharedWorker');
    }
  }

  /**
   * Ensure worker is connected before making calls
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }
}

// Singleton instance
export const workerBridge = new WorkerBridge();

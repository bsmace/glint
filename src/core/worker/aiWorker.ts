/**
 * Glint - AI SharedWorker for Off-Main-Thread Processing
 * Handles AI prompt improvement using window.ai API and Orama vector DB
 */

import { expose } from 'comlink';
import { create, insertMultiple, search, save, load } from '@orama/orama';
import type { Orama } from '@orama/orama';
import type { AIResponse, PromptHistoryItem } from '../../lib/ai/schema';

/**
 * Orama database schema for prompt history
 */
interface PromptSchema {
  id: string;
  originalText: string;
  improvedText: string;
  mode: 'improve' | 'concise' | 'context' | 'format';
  timestamp: number;
  characterCount: number;
}

/**
 * Extended PromptHistoryItem that includes worker-specific fields
 */
interface WorkerPromptHistoryItem extends Omit<PromptHistoryItem, 'site' | 'tags'> {
  mode: 'improve' | 'concise' | 'context' | 'format';
  characterCount: number;
}

/**
 * AI Worker API exposed via Comlink
 */
class AIWorker {
  private db: Orama<any> | null = null;
  private isInitialized = false;

  /**
   * Initialize the worker and Orama database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create Orama in-memory database for prompt history
      this.db = await create({
        schema: {
          id: 'string',
          originalText: 'string',
          improvedText: 'string',
          mode: 'string',
          timestamp: 'number',
          characterCount: 'number',
        },
      });

      this.isInitialized = true;
      console.log('[AIWorker] Initialized with Orama DB');
    } catch (error) {
      console.error('[AIWorker] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Improve prompt using native window.ai API
   */
  async improvePrompt(
    text: string,
    mode: 'improve' | 'concise' | 'context' | 'format'
  ): Promise<AIResponse> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Worker not initialized',
      };
    }

    try {
      // Check for native window.ai API availability
      if (typeof window === 'undefined' || !(window as any).ai?.rewriter) {
        // Fallback: simulate AI response for development/testing
        return this.simulateAIResponse(text, mode);
      }

      // Use native window.ai.rewriter API
      const rewriter = (window as any).ai.rewriter;
      let instruction = '';

      switch (mode) {
        case 'improve':
          instruction = 'Improve clarity, specificity, and effectiveness';
          break;
        case 'concise':
          instruction = 'Make more concise while preserving meaning';
          break;
        case 'context':
          instruction = 'Add relevant context and background';
          break;
        case 'format':
          instruction = 'Format for better readability and structure';
          break;
      }

      const result = await rewriter.rewrite(text, {
        instruction,
        tone: 'professional',
      });

      const improvedText = this.stripFillerPhrases(result.output);

      // Store in history
      await this.storeInHistory(text, improvedText, mode);

      return {
        success: true,
        result: improvedText,
        originalText: text,
        mode,
        characterCount: improvedText.length,
      };
    } catch (error) {
      console.error('[AIWorker] Error improving prompt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalText: text,
      };
    }
  }

  /**
   * Search prompt history using vector search
   */
  async searchHistory(
    query: string,
    limit: number = 5
  ): Promise<PromptHistoryItem[]> {
    if (!this.db || !this.isInitialized) {
      return [];
    }

    try {
      const results = await search(this.db, {
        term: query,
        properties: ['originalText', 'improvedText'],
        limit,
      });

      return results.hits.map((hit: any) => ({
        id: hit.document.id,
        originalText: hit.document.originalText,
        improvedText: hit.document.improvedText,
        mode: hit.document.mode,
        timestamp: hit.document.timestamp,
        characterCount: hit.document.characterCount,
      } as WorkerPromptHistoryItem));
    } catch (error) {
      console.error('[AIWorker] Search error:', error);
      return [];
    }
  }

  /**
   * Get recent prompt history
   */
  async getRecentHistory(limit: number = 10): Promise<WorkerPromptHistoryItem[]> {
    if (!this.db || !this.isInitialized) {
      return [];
    }

    try {
      // Get all documents defensively and sort by timestamp
      const dbAny = this.db as any;
      const docs = dbAny?.data?.docs;
      
      if (!docs || !Array.isArray(docs)) {
        return [];
      }
      
      // Create a defensive copy before sorting
      const allDocs: PromptSchema[] = [...docs].filter(
        (doc): doc is PromptSchema => 
          doc && 
          typeof doc.id === 'string' && 
          typeof doc.originalText === 'string' &&
          typeof doc.improvedText === 'string' &&
          typeof doc.mode === 'string' &&
          typeof doc.timestamp === 'number' &&
          typeof doc.characterCount === 'number'
      );
      
      return allDocs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)
        .map((doc) => ({
          id: doc.id,
          originalText: doc.originalText,
          improvedText: doc.improvedText,
          mode: doc.mode,
          timestamp: doc.timestamp,
          characterCount: doc.characterCount,
        }));
    } catch (error) {
      console.error('[AIWorker] Get recent history error:', error);
      return [];
    }
  }

  /**
   * Export database state as JSON
   */
  async exportDatabase(): Promise<string> {
    if (!this.db || !this.isInitialized) {
      return '';
    }

    try {
      const state = await save(this.db);
      return JSON.stringify(state);
    } catch (error) {
      console.error('[AIWorker] Export error:', error);
      return '';
    }
  }

  /**
   * Import database state from JSON
   */
  async importDatabase(stateJson: string): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const state = JSON.parse(stateJson);
      this.db = await load(state);
      return true;
    } catch (error) {
      console.error('[AIWorker] Import error:', error);
      return false;
    }
  }

  /**
   * Store prompt improvement in history
   */
  private async storeInHistory(
    originalText: string,
    improvedText: string,
    mode: string
  ): Promise<void> {
    if (!this.db) return;

    try {
      await insertMultiple(this.db, [
        {
          id: crypto.randomUUID(),
          originalText,
          improvedText,
          mode,
          timestamp: Date.now(),
          characterCount: improvedText.length,
        },
      ]);
    } catch (error) {
      console.error('[AIWorker] Failed to store in history:', error);
    }
  }

  /**
   * Strip common filler phrases from AI output
   */
  private stripFillerPhrases(text: string): string {
    const fillerPatterns = [
      /^here's?\s+(your\s+)?(improved|revised|rewritten)\s+(prompt|text)[:\s]*/i,
      /^here\s+is\s+(your\s+)?(improved|revised|rewritten)\s+(prompt|text)[:\s]*/i,
      /^(sure|certainly|of\s+course),?\s+here's?\s*(your\s+)?(improved|revised)[:\s]*/i,
      /^(let\s+me\s+)?(help\s+)?(you\s+)?(with|improve)\s+(that|this)[:\s]*/i,
      /^as\s+an?\s+ai[:\s]*/i,
      /^\*\*(improved|revised|rewritten)\s+(prompt|text):\*\*\s*/i,
    ];

    let result = text.trim();

    for (const pattern of fillerPatterns) {
      result = result.replace(pattern, '');
    }

    return result.trim();
  }

  /**
   * Simulate AI response for development/testing without window.ai
   */
  private simulateAIResponse(
    text: string,
    mode: 'improve' | 'concise' | 'context' | 'format'
  ): AIResponse {
    let improvedText = text;

    switch (mode) {
      case 'improve':
        improvedText = `[Improved] ${text} - Enhanced for clarity and specificity.`;
        break;
      case 'concise':
        improvedText = text.split(' ').slice(0, Math.ceil(text.split(' ').length * 0.7)).join(' ');
        break;
      case 'context':
        improvedText = `[Context Added] Background: This request relates to your current task. ${text}`;
        break;
      case 'format':
        improvedText = `**Formatted Request:**\n\n${text}\n\n---\n*Please address each point above.*`;
        break;
    }

    // Store in history even for simulated responses
    this.storeInHistory(text, improvedText, mode);

    return {
      success: true,
      result: improvedText,
      originalText: text,
      mode,
      characterCount: improvedText.length,
    };
  }
}

// Handle SharedWorker connections via onconnect
self.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  const workerInstance = new AIWorker();
  expose(workerInstance, port);
  port.start();
};

// Also expose for dedicated worker fallback
const dedicatedWorkerInstance = new AIWorker();
expose(dedicatedWorkerInstance);

export default dedicatedWorkerInstance;

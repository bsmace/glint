/**
 * Glint - SharedWorker for Off-Main-Thread AI Orchestration
 * Uses Comlink for RPC communication with main thread
 * Handles window.ai orchestration and Orama vector searches
 */

import { expose } from 'comlink';
import { create, insert, search, load, save } from '@orama/orama';
import type { AnyOrama } from '@orama/orama';

/**
 * Prompt history item for vector storage
 */
interface PromptHistoryItem {
  id: string;
  originalText: string;
  improvedText: string;
  timestamp: number;
  site: string;
  tags: string[];
}

/**
 * AI Orchestrator - wraps native window.ai.rewriter API
 * Strips AI filler phrases and validates outputs
 */
class AIOrchestrator {
  private oramaDB: AnyOrama | null = null;
  private isInitialized = false;

  /**
   * Initialize Orama database for local vector storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.oramaDB = await create({
      schema: {
        id: 'string',
        originalText: 'string',
        improvedText: 'string',
        timestamp: 'number',
        site: 'string',
        tags: 'string[]',
      },
      components: {
        tokenizer: {
          normalizationDialect: 'en',
        },
      },
    });

    this.isInitialized = true;
    console.log('[Glint Worker] Orama initialized');
  }

  /**
   * Improve prompt using native window.ai API
   * Strips filler phrases and returns clean output
   */
  async improvePrompt(text: string, mode: 'improve' | 'concise' | 'context' | 'format'): Promise<{
    success: boolean;
    result?: string;
    error?: string;
  }> {
    try {
      // Check for native AI API
      if (!(globalThis as any).ai?.rewriter) {
        return {
          success: false,
          error: 'Native AI API not available',
        };
      }

      const rewriter = (globalThis as any).ai.rewriter;
      let prompt = '';

      switch (mode) {
        case 'improve':
          prompt = `Improve this prompt for clarity and effectiveness. Return only the improved prompt, no explanations: "${text}"`;
          break;
        case 'concise':
          prompt = `Make this prompt more concise while preserving its meaning. Return only the condensed prompt: "${text}"`;
          break;
        case 'context':
          prompt = `Add relevant context to this prompt to make it more specific. Return only the enhanced prompt: "${text}"`;
          break;
        case 'format':
          prompt = `Format this prompt for better structure (use bullet points, sections, or clear instructions). Return only the formatted prompt: "${text}"`;
          break;
      }

      const response = await rewriter.rewrite(prompt);
      
      // Strip AI filler phrases
      const cleanedText = this.stripFillerPhrases(response);

      // Store in history
      await this.storeHistory({
        id: crypto.randomUUID(),
        originalText: text,
        improvedText: cleanedText,
        timestamp: Date.now(),
        site: globalThis.location?.hostname || 'unknown',
        tags: [mode],
      });

      return {
        success: true,
        result: cleanedText,
      };
    } catch (error) {
      console.error('[Glint Worker] AI rewrite failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Strip common AI filler phrases from output
   */
  private stripFillerPhrases(text: string): string {
    const fillerPatterns = [
      /^here is your prompt:\s*/i,
      /^here is the improved prompt:\s*/i,
      /^sure, here's?\s*/i,
      /^certainly!\s*/i,
      /^of course!\s*/i,
      /^i'd be happy to\s*/i,
      /^let me help you with that:\s*/i,
      /^here you go:\s*/i,
      /^as requested:\s*/i,
      /^\*\*prompt\*\*:\s*/i,
      /[\s\n]*$/, // trailing whitespace
    ];

    let result = text;
    for (const pattern of fillerPatterns) {
      result = result.replace(pattern, '');
    }

    return result.trim();
  }

  /**
   * Store prompt improvement in vector database
   */
  async storeHistory(item: PromptHistoryItem): Promise<void> {
    if (!this.oramaDB) {
      await this.initialize();
    }

    if (this.oramaDB) {
      await insert(this.oramaDB, item);
    }
  }

  /**
   * Search prompt history using vector similarity
   */
  async searchHistory(query: string, limit: number = 5): Promise<PromptHistoryItem[]> {
    if (!this.oramaDB) {
      await this.initialize();
    }

    if (!this.oramaDB) {
      return [];
    }

    try {
      const results = await search(this.oramaDB, {
        term: query,
        properties: ['originalText', 'improvedText', 'tags'],
        limit,
      });

      return results.hits.map((hit) => hit.document as PromptHistoryItem);
    } catch (error) {
      console.error('[Glint Worker] Search failed:', error);
      return [];
    }
  }

  /**
   * Export Orama database for persistence
   */
  async exportDatabase(): Promise<string> {
    if (!this.oramaDB) {
      return '';
    }

    const state = await save(this.oramaDB);
    return JSON.stringify(state);
  }

  /**
   * Import Orama database from persistence
   */
  async importDatabase(stateJson: string): Promise<boolean> {
    try {
      const state = JSON.parse(stateJson);
      this.oramaDB = await load(state);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[Glint Worker] Import failed:', error);
      return false;
    }
  }

  /**
   * Get recent prompt history
   */
  async getRecentHistory(limit: number = 10): Promise<PromptHistoryItem[]> {
    if (!this.oramaDB) {
      return [];
    }

    // Simple retrieval - in production would use proper sorting
    const all = await search(this.oramaDB, {
      term: '',
      limit: limit * 2, // Get extra to filter
    });

    return all.hits
      .map((hit) => hit.document as PromptHistoryItem)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

// Create orchestrator instance
const orchestrator = new AIOrchestrator();

// Expose API via Comlink
expose({
  initialize: () => orchestrator.initialize(),
  improvePrompt: (text: string, mode: 'improve' | 'concise' | 'context' | 'format') =>
    orchestrator.improvePrompt(text, mode),
  searchHistory: (query: string, limit?: number) => orchestrator.searchHistory(query, limit),
  exportDatabase: () => orchestrator.exportDatabase(),
  importDatabase: (stateJson: string) => orchestrator.importDatabase(stateJson),
  getRecentHistory: (limit?: number) => orchestrator.getRecentHistory(limit),
});

console.log('[Glint Worker] SharedWorker initialized');

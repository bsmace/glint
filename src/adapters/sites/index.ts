/**
 * Glint - Site Adapters Index
 * Exports all site-specific detection strategies
 */

export { ChatGPTStrategy, isChatGPTSite, getChatGPTSelectors } from './chatgpt';
export { ClaudeStrategy, isClaudeSite, getClaudeSelectors } from './claude';
export { GeminiStrategy, isGeminiSite, getGeminiSelectors } from './gemini';

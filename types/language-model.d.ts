interface LanguageModelPromptOptions {
  initialPrompts?: Array<{ role: string; content: string }>;
  temperature?: number;
  topK?: number;
}

interface LanguageModelSession {
  prompt(text: string): Promise<string>;
  destroy(): void;
}

declare global {
  interface Window {
    LanguageModel?: {
      create(options: LanguageModelPromptOptions): Promise<LanguageModelSession>;
    };
  }
}

export {};

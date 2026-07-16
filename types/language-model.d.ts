interface AISession {
  prompt(text: string): Promise<string>;
  destroy(): void;
  clone(): Promise<AISession>;
}

interface LanguageModelFactory {
  create(options: {
    initialPrompts?: { role: string; content: string }[];
    temperature?: number;
    topK?: number;
  }): Promise<AISession>;
}

interface LanguageModelAvailability {
  LanguageModel?: LanguageModelFactory;
}

declare global {
  var LanguageModel: LanguageModelFactory | undefined;
}

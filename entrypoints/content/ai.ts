import type { ChipAction } from '../../shared/ai';
import { AI_GENERATION_TIMEOUT_MS } from '../../shared/constants';

type AISession = { prompt: (text: string) => Promise<string>; destroy: () => void };
type LMFactory = { create: (opts: unknown) => Promise<AISession> };

type AIProvider = {
  generate: (action: ChipAction, input: string, instruction?: string) => Promise<string>;
  destroy: () => void;
};

const RARE_SYSTEM = `You are a prompt engineering assistant. Given a user's prompt, rewrite it using the RARE framework:

Restate — Express the core intent more clearly.
Analyze — Identify what the prompt is missing (context, constraints, format).
Refine — Restructure for clarity and specificity.
Expand — Add relevant context, examples, or output format instructions.

Output ONLY the rewritten prompt. No labels, no explanation, no metadata.`;

export const INSTRUCTIONS: Record<ChipAction, string> = {
  improve: `Rewrite this prompt using the RARE framework. Make it specific, structured, and effective.\n\n`,
  concise: `Rewrite this prompt to be shorter and more direct while preserving the core intent. Remove redundancy.\n\n`,
  addContext: `Expand this prompt with relevant context, background, and specific constraints to help the AI understand the scenario.\n\n`,
  format: `Restructure this prompt for clarity. Use sections, bullet points, step numbering, or clear delimiters.\n\n`,
};

function getLM(): LMFactory | null {
  return (globalThis as unknown as { LanguageModel?: LMFactory }).LanguageModel ?? null;
}

async function initPromptAPI(): Promise<AIProvider> {
  const LM = getLM();
  if (!LM) throw new Error('LanguageModel not available');
  const base = await LM.create({
    initialPrompts: [{ role: 'system', content: RARE_SYSTEM }],
    temperature: 0.3,
    topK: 3,
  });

  const promptWithInstruction = (session: AISession, action: ChipAction, input: string, instruction?: string) => {
    const prefix = instruction ?? INSTRUCTIONS[action];
    return session.prompt(prefix + input);
  };

  if (!('clone' in base)) {
    return {
      generate: async (action: ChipAction, input: string, instruction?: string) => {
        const result = await Promise.race([
          promptWithInstruction(base, action, input, instruction),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('AI generation timed out')), AI_GENERATION_TIMEOUT_MS),
          ),
        ]);
        return result;
      },
      destroy: () => base.destroy(),
    };
  }

  return {
    generate: async (action: ChipAction, input: string, instruction?: string) => {
      const clone = await (base as unknown as { clone: () => Promise<AISession> }).clone();
      try {
        return await Promise.race([
          promptWithInstruction(clone, action, input, instruction),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('AI generation timed out')), AI_GENERATION_TIMEOUT_MS),
          ),
        ]);
      } finally {
        clone.destroy();
      }
    },
    destroy: () => base.destroy(),
  };
}

const FALLBACK_INSTRUCTIONS: Record<ChipAction, string> = {
  improve: 'Make this more specific, structured, and effective.',
  concise: 'Keep it brief and direct.',
  addContext: 'Add relevant context and background.',
  format: 'Structure this with clear sections.',
};

function initFallback(): AIProvider {
  return {
    async generate(action: ChipAction, input: string, instruction?: string) {
      if (input.trim().length < 10) return input;
      const expanded = input.endsWith('.') || input.endsWith('?') || input.endsWith('!')
        ? input
        : input + '.';
      return `${expanded}\n\n${instruction ?? FALLBACK_INSTRUCTIONS[action]}`;
    },
    destroy() {},
  };
}

export async function createAI(): Promise<{ provider: AIProvider; onDevice: boolean }> {
  try {
    const LM = (globalThis as unknown as { LanguageModel?: { create: (opts: unknown) => Promise<{ prompt: (text: string) => Promise<string>; destroy: () => void }> } }).LanguageModel;
    if (LM?.create) {
      const provider = await initPromptAPI();
      return { provider, onDevice: true };
    }
  } catch {}
  return { provider: initFallback(), onDevice: false };
}

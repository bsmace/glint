import type { ChipAction } from '../../shared/ai';

type AIProvider = {
  generate: (action: ChipAction, input: string) => Promise<string>;
  destroy: () => void;
};

const RARE_SYSTEM = `You are a prompt engineering assistant. Given a user's prompt, rewrite it using the RARE framework:

Restate — Express the core intent more clearly.
Analyze — Identify what the prompt is missing (context, constraints, format).
Refine — Restructure for clarity and specificity.
Expand — Add relevant context, examples, or output format instructions.

Output ONLY the rewritten prompt. No labels, no explanation, no metadata.`;

const INSTRUCTIONS: Record<ChipAction, string> = {
  improve: `Rewrite this prompt using the RARE framework. Make it specific, structured, and effective.\n\n`,
  concise: `Rewrite this prompt to be shorter and more direct while preserving the core intent. Remove redundancy.\n\n`,
  addContext: `Expand this prompt with relevant context, background, and specific constraints to help the AI understand the scenario.\n\n`,
  format: `Restructure this prompt for clarity. Use sections, bullet points, step numbering, or clear delimiters.\n\n`,
};

async function initPromptAPI(): Promise<AIProvider> {
  const LM = (globalThis as any).LanguageModel;
  const session = await LM.create({
    initialPrompts: [{ role: 'system', content: RARE_SYSTEM }],
    temperature: 0.3,
    topK: 3,
  });

  return {
    generate: (action: ChipAction, input: string) =>
      session.prompt(INSTRUCTIONS[action] + input),
    destroy: () => session.destroy(),
  };
}

function initFallback(): AIProvider {
  return {
    async generate(_action: ChipAction, input: string) {
      if (input.trim().length < 10) return input;
      const expanded = input.endsWith('.') || input.endsWith('?') || input.endsWith('!')
        ? input
        : input + '.';
      return `${expanded}\n\nPlease provide a thorough, well-structured response with clear reasoning, examples where appropriate, and actionable conclusions.`;
    },
    destroy() {},
  };
}

export async function createAI(): Promise<{ provider: AIProvider; onDevice: boolean }> {
  try {
    const LM = (globalThis as any).LanguageModel;
    if (LM?.create) {
      const provider = await initPromptAPI();
      return { provider, onDevice: true };
    }
  } catch {}
  return { provider: initFallback(), onDevice: false };
}

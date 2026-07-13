import type { ChipAction } from './ai';

export type BackgroundRequest =
  | { type: 'saveMemory'; content: string; expanded: string; action: ChipAction }
  | { type: 'getMemoryStats' }
  | { type: 'listVariables' }
  | { type: 'saveVariable'; key: string; value: string; description: string }
  | { type: 'deleteVariable'; id: number }
  | { type: 'listFolders' }
  | { type: 'saveFolder'; name: string; parentId: number | null }
  | { type: 'deleteFolder'; id: number };

export type BackgroundResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

export function bg(req: BackgroundRequest): Promise<BackgroundResponse> {
  return chrome.runtime.sendMessage(req);
}

import type { ChipAction } from './ai';

export type BackgroundRequest =
  | { type: 'saveMemory'; content: string; expanded: string; action: ChipAction; url: string }
  | { type: 'getMemoryStats' }
  | { type: 'listVariables' }
  | { type: 'saveVariable'; key: string; value: string; description: string }
  | { type: 'deleteVariable'; id: number }
  | { type: 'listFolders' }
  | { type: 'saveFolder'; name: string; parentId: number | null }
  | { type: 'deleteFolder'; id: number }
  | { type: 'savePrompt'; title: string; content: string; folderId: number | null }
  | { type: 'listSavedPrompts' }
  | { type: 'reportTelemetry'; data: TelemetryData }
  | { type: 'getTelemetry' }
  | { type: 'deleteSavedPrompt'; id: number }
  | { type: 'listRecentMemory'; limit?: number };

export type BackgroundResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

// Type guards
export function isBackgroundRequest(req: unknown): req is BackgroundRequest {
  return typeof req === 'object' && req !== null && 'type' in req && typeof (req as any).type === 'string';
}

export function isSuccessfulResponseWithData<T>(res: BackgroundResponse, guard: (data: unknown) => data is T): res is { ok: true; data: T } {
  return res.ok === true && 'data' in res && guard(res.data);
}

export type TelemetryData = {
  detectByStrategy: Record<string, number>;
  anchorReflowCount: number;
  aiLatencyMs: { count: number; total: number };
};

export function bg(req: BackgroundRequest): Promise<BackgroundResponse> {
  return chrome.runtime.sendMessage(req);
}

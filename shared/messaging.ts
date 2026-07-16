import type { ChipAction } from './ai';

export type BackgroundRequest =
  | { type: 'saveMemory'; content: string; expanded: string; action: ChipAction; url: string }
  | { type: 'getMemoryStats' }
  | { type: 'listVariables' }
  | { type: 'saveVariable'; key: string; value: string; description: string }
  | { type: 'deleteVariable'; id: number }
  | { type: 'listFolders' }
  | { type: 'saveFolder'; name: string; parentId: number | null }
  | { type: 'renameFolder'; id: number; name: string }
  | { type: 'deleteFolder'; id: number }
  | { type: 'savePrompt'; title: string; content: string; folderId: number | null }
  | { type: 'listSavedPrompts' }
  | { type: 'reportTelemetry'; data: TelemetryData }
  | { type: 'getTelemetry' }
  | { type: 'deleteSavedPrompt'; id: number }
  | { type: 'listRecentMemory'; limit?: number }
  | { type: 'getDomainVariables'; domain: string }
  | { type: 'recordDomainVariables'; domain: string; keys: string[] }
  | { type: 'refreshAdapterConfig' }
  | { type: 'getAdapterVersion' }
  | { type: 'updatePrompt'; id: number; title: string; content: string; folderId: number | null }
  | { type: 'listPromptVersions'; promptId: number }
  | { type: 'getPromptVersion'; id: number }
  | { type: 'rollbackPrompt'; promptId: number; versionId: number }
  | { type: 'listCustomChips' }
  | { type: 'saveCustomChip'; name: string; label: string; instruction: string }
  | { type: 'updateCustomChip'; id: number; name: string; label: string; instruction: string }
  | { type: 'deleteCustomChip'; id: number }
  | { type: 'listBrandVoices' }
  | { type: 'getBrandVoiceForDomain'; domain: string }
  | { type: 'saveBrandVoice'; name: string; domain: string; tone: string; vocabulary: string[]; rules: string[]; examples: string[] }
  | { type: 'deleteBrandVoice'; id: number }
  | { type: 'getSetting'; key: string }
  | { type: 'setSetting'; key: string; value: string }
  | { type: 'getProTier' }
  | { type: 'listTeamMembers' }
  | { type: 'addTeamMember'; email: string; role: 'viewer' | 'editor' | 'admin' }
  | { type: 'removeTeamMember'; id: number }
  | { type: 'listSharedFolders' }
  | { type: 'saveSharedFolder'; name: string }
  | { type: 'deleteSharedFolder'; id: number }
  | { type: 'createABTest'; name: string; promptA: string; promptB: string; variables: string }
  | { type: 'listABTests' }
  | { type: 'updateABTestResult'; id: number; resultA: string; resultB: string }
  | { type: 'markABTestWinner'; id: number; winner: 'A' | 'B' }
  | { type: 'deleteABTest'; id: number }
  | { type: 'dismissReview' }
  | { type: 'getStalePrompts'; days?: number }
  | { type: 'getStaleMemory'; days?: number }
  | { type: 'getReviewStatus' };

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
  cacheHitCount?: number;
  adapterVersion?: number;
};

export function bg(req: BackgroundRequest): Promise<BackgroundResponse> {
  return chrome.runtime.sendMessage(req);
}

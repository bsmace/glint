import Dexie, { type EntityTable } from 'dexie';

export type Folder = {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  createdAt: number;
};

export type SavedPrompt = {
  id: number;
  title: string;
  content: string;
  folderId: number | null;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
};

export type Variable = {
  id: number;
  key: string;
  value: string;
  description: string;
  createdAt: number;
  updatedAt: number;
};

export type MemoryEntry = {
  id: number;
  content: string;
  expandedContent: string;
  action: string;
  url: string;
  createdAt: number;
};

export type TelemetryEntry = {
  id: number;
  detectByStrategy: Record<string, number>;
  anchorReflowCount: number;
  aiLatencyMs: { count: number; total: number };
  cacheHitCount?: number;
  adapterVersion?: number;
  createdAt: number;
};

export type PromptCacheEntry = {
  hash: string;
  original: string;
  improved: string;
  action: string;
  domain: string;
  createdAt: number;
};

export type DomainVariable = {
  id: number;
  domain: string;
  variableKey: string;
  createdAt: number;
};

export type AdapterEntry = {
  domain: string;
  selector: string;
};

export type AdapterConfigEntry = {
  id: number;
  adapters: AdapterEntry[];
  version: number;
  fetchedAt: number;
};

export type ABTest = {
  id: number;
  name: string;
  promptA: string;
  promptB: string;
  variables: string;
  resultA: string;
  resultB: string;
  winner: 'A' | 'B' | null;
  createdAt: number;
};

export type Setting = {
  id: number;
  key: string;
  value: string;
};

export type TeamMember = {
  id: number;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  addedAt: number;
};

export type SharedFolder = {
  id: number;
  name: string;
  remoteId?: string;
  lastSyncedAt?: number;
  createdAt: number;
};

export type SharedPrompt = {
  id: number;
  localId: number;
  remoteId?: string;
  sharedFolderId: number;
  lastSyncedAt?: number;
  createdAt: number;
};

export type BrandVoice = {
  id: number;
  name: string;
  domain: string;
  tone: string;
  vocabulary: string[];
  rules: string[];
  examples: string[];
  createdAt: number;
  updatedAt: number;
};

export type CustomChip = {
  id: number;
  name: string;
  label: string;
  instruction: string;
  createdAt: number;
  updatedAt: number;
};

export type PromptVersion = {
  id: number;
  promptId: number;
  version: number;
  content: string;
  title: string;
  createdAt: number;
};

export const MAX_PROMPT_VERSIONS = 10;

const db = new Dexie('glint') as Dexie & {
  folders: EntityTable<Folder, 'id'>;
  savedPrompts: EntityTable<SavedPrompt, 'id'>;
  variables: EntityTable<Variable, 'id'>;
  memory: EntityTable<MemoryEntry, 'id'>;
  telemetry: EntityTable<TelemetryEntry, 'id'>;
  promptCache: EntityTable<PromptCacheEntry, 'hash'>;
  domainVariables: EntityTable<DomainVariable, 'id'>;
  adapterConfig: EntityTable<AdapterConfigEntry, 'id'>;
  promptVersions: EntityTable<PromptVersion, 'id'>;
  customChips: EntityTable<CustomChip, 'id'>;
  brandVoices: EntityTable<BrandVoice, 'id'>;
  abTests: EntityTable<ABTest, 'id'>;
  settings: EntityTable<Setting, 'id'>;
  teamMembers: EntityTable<TeamMember, 'id'>;
  sharedFolders: EntityTable<SharedFolder, 'id'>;
  sharedPrompts: EntityTable<SharedPrompt, 'id'>;
};

db.version(6).stores({
  folders: '++id, parentId, sortOrder',
  savedPrompts: '++id, folderId, createdAt, updatedAt',
  variables: '++id, key, createdAt',
  memory: '++id, createdAt, action',
  telemetry: '++id, createdAt',
  promptCache: '&hash, createdAt',
  domainVariables: '++id, domain, variableKey',
  adapterConfig: '++id, fetchedAt',
  promptVersions: '++id, promptId, version, createdAt',
  customChips: '++id, name, createdAt',
  brandVoices: '++id, domain, name, createdAt',
  settings: '++id, &key',
  abTests: '++id, name, createdAt',
  teamMembers: '++id, email, role',
  sharedFolders: '++id, name, remoteId',
  sharedPrompts: '++id, localId, sharedFolderId, remoteId',
});

export default db;

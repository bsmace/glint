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
  createdAt: number;
};

const db = new Dexie('glint') as Dexie & {
  folders: EntityTable<Folder, 'id'>;
  savedPrompts: EntityTable<SavedPrompt, 'id'>;
  variables: EntityTable<Variable, 'id'>;
  memory: EntityTable<MemoryEntry, 'id'>;
  telemetry: EntityTable<TelemetryEntry, 'id'>;
};

db.version(1).stores({
  folders: '++id, parentId, sortOrder',
  savedPrompts: '++id, folderId, createdAt, updatedAt',
  variables: '++id, key, createdAt',
  memory: '++id, createdAt, action',
  telemetry: '++id, createdAt',
});

export default db;

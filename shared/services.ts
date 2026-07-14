import db, { type TelemetryEntry } from './db';
import type { TelemetryData } from './messaging';
import { WEEK_IN_MS } from './constants';

function validateString(value: unknown, fieldName: string, maxLength = 10000): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  if (value.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }
}

function validateNumber(value: unknown, fieldName: string): asserts value is number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} must be a number`);
  }
}

export async function listVariables() {
  return db.variables.orderBy('key').toArray();
}

function validateDetectByStrategy(value: unknown): asserts value is Record<string, number> {
  if (typeof value !== 'object' || value === null) {
    throw new Error('detectByStrategy must be an object');
  }
  for (const [k, v] of Object.entries(value)) {
    if (typeof k !== 'string' || typeof v !== 'number') {
      throw new Error('detectByStrategy must have string keys and number values');
    }
  }
}

export async function saveTelemetry(data: TelemetryData) {
  validateDetectByStrategy(data.detectByStrategy);
  validateNumber(data.anchorReflowCount, 'anchorReflowCount');
  validateNumber(data.aiLatencyMs.count, 'aiLatencyMs.count');
  validateNumber(data.aiLatencyMs.total, 'aiLatencyMs.total');
  if (Object.keys(data.detectByStrategy).length > 0 || data.anchorReflowCount > 0 || data.aiLatencyMs.count > 0) {
    await db.telemetry.add({ ...data, createdAt: Date.now() });
  }
}

export async function getLatestTelemetry(): Promise<TelemetryData | null> {
  const entry = await db.telemetry.orderBy('createdAt').last();
  if (!entry) return null;
  return {
    detectByStrategy: entry.detectByStrategy,
    anchorReflowCount: entry.anchorReflowCount,
    aiLatencyMs: entry.aiLatencyMs
  };
}

export async function saveVariable(key: string, value: string, description = '') {
  validateString(key, 'key', 100);
  validateString(value, 'value');
  validateString(description, 'description', 500);
  const existing = await db.variables.where('key').equals(key).first();
  if (existing) {
    await db.variables.update(existing.id, { value, description, updatedAt: Date.now() });
    return existing.id;
  }
  return db.variables.add({ key, value, description, createdAt: Date.now(), updatedAt: Date.now() });
}

export async function deleteVariable(id: number) {
  validateNumber(id, 'id');
  await db.variables.delete(id);
}

export async function listFolders() {
  return db.folders.orderBy('sortOrder').toArray();
}

export async function saveFolder(name: string, parentId: number | null = null) {
  validateString(name, 'name', 100);
  if (parentId !== null) validateNumber(parentId, 'parentId');
  const max = await db.folders.orderBy('sortOrder').last();
  return db.folders.add({ name, parentId, sortOrder: (max?.sortOrder ?? 0) + 1, createdAt: Date.now() });
}

export async function deleteFolder(id: number) {
  validateNumber(id, 'id');
  await db.transaction('rw', db.savedPrompts, db.folders, async () => {
    await db.savedPrompts.where('folderId').equals(id).modify({ folderId: null });
    await db.folders.where('parentId').equals(id).delete();
    await db.folders.delete(id);
  });
}

export function saveToMemory(content: string, expandedContent: string, action: string, url: string) {
  validateString(content, 'content');
  validateString(expandedContent, 'expandedContent');
  validateString(action, 'action', 50);
  validateString(url, 'url', 2048);
  return db.memory.add({
    content,
    expandedContent,
    action,
    url,
    createdAt: Date.now(),
  });
}

export async function savePrompt(title: string, content: string, folderId: number | null = null) {
  validateString(title, 'title', 200);
  validateString(content, 'content');
  if (folderId !== null) validateNumber(folderId, 'folderId');
  return db.savedPrompts.add({
    title, content, folderId,
    createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
  });
}

export async function listSavedPrompts() {
  return db.savedPrompts.orderBy('updatedAt').reverse().toArray();
}

export async function getMemoryStats() {
  const weekAgo = Date.now() - WEEK_IN_MS;
  let total = 0;
  let weekly = 0;
  const byAction: Record<string, number> = { improve: 0, concise: 0, addContext: 0, format: 0 };
  
  await db.memory.each(entry => {
    total++;
    if (entry.createdAt > weekAgo) {
      weekly++;
    }
    if (byAction[entry.action] !== undefined) {
      byAction[entry.action]++;
    }
  });
  
  return { total, weekly, byAction };
}

export async function listRecentMemory(limit = 20) {
  validateNumber(limit, 'limit');
  return db.memory.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function deleteSavedPrompt(id: number) {
  validateNumber(id, 'id');
  await db.savedPrompts.delete(id);
}

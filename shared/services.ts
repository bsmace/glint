import db from './db';

export async function listVariables() {
  return db.variables.orderBy('key').toArray();
}

export async function saveVariable(key: string, value: string, description = '') {
  const existing = await db.variables.where('key').equals(key).first();
  if (existing) {
    await db.variables.update(existing.id, { value, description, updatedAt: Date.now() });
    return existing.id;
  }
  return db.variables.add({ key, value, description, createdAt: Date.now(), updatedAt: Date.now() });
}

export async function deleteVariable(id: number) {
  await db.variables.delete(id);
}

export async function listFolders() {
  return db.folders.orderBy('sortOrder').toArray();
}

export async function saveFolder(name: string, parentId: number | null = null) {
  const max = await db.folders.orderBy('sortOrder').last();
  return db.folders.add({ name, parentId, sortOrder: (max?.sortOrder ?? 0) + 1, createdAt: Date.now() });
}

export async function deleteFolder(id: number) {
  await db.savedPrompts.where('folderId').equals(id).modify({ folderId: null });
  await db.folders.where('parentId').equals(id).delete();
  await db.folders.delete(id);
}

export function saveToMemory(content: string, expandedContent: string, action: string, url: string) {
  return db.memory.add({
    content,
    expandedContent,
    action,
    url,
    createdAt: Date.now(),
  });
}

export async function savePrompt(title: string, content: string, folderId: number | null = null) {
  return db.savedPrompts.add({
    title, content, folderId,
    createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0,
  });
}

export async function listSavedPrompts() {
  return db.savedPrompts.orderBy('updatedAt').reverse().toArray();
}

export async function getMemoryStats() {
  const total = await db.memory.count();
  const weekAgo = Date.now() - 7 * 86400_000;
  const weekly = await db.memory.where('createdAt').above(weekAgo).count();
  const byAction: Record<string, number> = {};
  await db.memory.each((e) => { byAction[e.action] = (byAction[e.action] ?? 0) + 1; });
  return { total, weekly, byAction };
}

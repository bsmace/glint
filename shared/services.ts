import db, { type TelemetryEntry, type AdapterEntry, type PromptVersion, type CustomChip, type BrandVoice, type Setting, MAX_PROMPT_VERSIONS } from './db';
import type { TelemetryData } from './messaging';
import { WEEK_IN_MS, MAX_MEMORY_ENTRIES, MEMORY_PRUNE_DAYS, CACHE_TTL_MS, CACHE_MAX_ENTRIES, ADAPTER_CONFIG_URL, ADAPTER_CACHE_TTL_MS } from './constants';

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
  if (data.cacheHitCount !== undefined) validateNumber(data.cacheHitCount, 'cacheHitCount');
  if (data.adapterVersion !== undefined) validateNumber(data.adapterVersion, 'adapterVersion');
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
    aiLatencyMs: entry.aiLatencyMs,
    cacheHitCount: entry.cacheHitCount,
    adapterVersion: entry.adapterVersion,
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

export async function renameFolder(id: number, name: string) {
  validateNumber(id, 'id');
  validateString(name, 'name', 100);
  await db.folders.update(id, { name });
}

export async function deleteFolder(id: number) {
  validateNumber(id, 'id');
  await db.transaction('rw', db.savedPrompts, db.folders, async () => {
    await db.savedPrompts.where('folderId').equals(id).modify({ folderId: null });
    await db.folders.where('parentId').equals(id).delete();
    await db.folders.delete(id);
  });
}

export async function saveToMemory(content: string, expandedContent: string, action: string, url: string) {
  validateString(content, 'content');
  validateString(expandedContent, 'expandedContent');
  validateString(action, 'action', 50);
  validateString(url, 'url', 2048);
  const id = await db.memory.add({
    content,
    expandedContent,
    action,
    url,
    createdAt: Date.now(),
  });
  const count = await db.memory.count();
  if (count > MAX_MEMORY_ENTRIES) {
    const cutoff = Date.now() - MEMORY_PRUNE_DAYS * 86400000;
    const toDelete = await db.memory.where('createdAt').below(cutoff).primaryKeys();
    if (toDelete.length > 0) {
      await db.memory.bulkDelete(toDelete.slice(0, count - Math.floor(MAX_MEMORY_ENTRIES * 0.8)));
    } else {
      const excess = count - Math.floor(MAX_MEMORY_ENTRIES * 0.8);
      const keys = await db.memory.orderBy('createdAt').limit(excess).primaryKeys();
      await db.memory.bulkDelete(keys);
    }
  }
  return id;
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

export async function updatePrompt(id: number, title: string, content: string, folderId: number | null = null) {
  validateNumber(id, 'id');
  validateString(title, 'title', 200);
  validateString(content, 'content');
  if (folderId !== null) validateNumber(folderId, 'folderId');
  const existing = await db.savedPrompts.get(id);
  if (!existing) throw new Error('Prompt not found');
  return db.transaction('rw', db.savedPrompts, db.promptVersions, async () => {
    const existingVersions = await db.promptVersions
      .where('promptId').equals(id)
      .toArray();
    existingVersions.sort((a, b) => a.version - b.version);
    const nextVer = existingVersions.length > 0 ? existingVersions[existingVersions.length - 1].version + 1 : 1;
    await db.promptVersions.add({
      promptId: id,
      version: nextVer,
      content: existing.content,
      title: existing.title,
      createdAt: Date.now(),
    });
    await db.savedPrompts.update(id, { title, content, folderId, updatedAt: Date.now() });
    if (existingVersions.length >= MAX_PROMPT_VERSIONS) {
      const toRemove = existingVersions.length - MAX_PROMPT_VERSIONS + 1;
      const oldest = existingVersions.slice(0, toRemove);
      if (oldest.length > 0) await db.promptVersions.bulkDelete(oldest.map(v => v.id));
    }
  });
}

export async function listPromptVersions(promptId: number) {
  validateNumber(promptId, 'promptId');
  return db.promptVersions
    .where('promptId').equals(promptId)
    .sortBy('version');
}

export async function getPromptVersion(id: number) {
  validateNumber(id, 'id');
  return db.promptVersions.get(id);
}

export async function rollbackPrompt(promptId: number, versionId: number) {
  validateNumber(promptId, 'promptId');
  validateNumber(versionId, 'versionId');
  const [version, current] = await Promise.all([
    db.promptVersions.get(versionId),
    db.savedPrompts.get(promptId),
  ]);
  if (!version) throw new Error('Version not found');
  if (!current) throw new Error('Prompt not found');
  return updatePrompt(promptId, version.title, version.content, current.folderId);
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

export async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getCachedResult(hash: string): Promise<string | null> {
  return db.transaction('rw', db.promptCache, async () => {
    const entry = await db.promptCache.get(hash);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
      await db.promptCache.delete(hash);
      return null;
    }
    await db.promptCache.update(hash, { createdAt: Date.now() });
    return entry.improved;
  });
}

export async function setCachedResult(hash: string, original: string, improved: string, action: string, domain: string) {
  await db.promptCache.put({ hash, original, improved, action, domain, createdAt: Date.now() });
  const count = await db.promptCache.count();
  if (count > CACHE_MAX_ENTRIES) {
    const keys = await db.promptCache.orderBy('createdAt').limit(count - CACHE_MAX_ENTRIES).primaryKeys();
    if (keys.length > 0) await db.promptCache.bulkDelete(keys);
  }
}

export async function getCachedAdapterVersion(): Promise<number | null> {
  const entry = await db.adapterConfig.orderBy('id').last();
  return entry?.version ?? null;
}

export async function getCachedAdapters(): Promise<AdapterEntry[] | null> {
  const entry = await db.adapterConfig.orderBy('id').last();
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > ADAPTER_CACHE_TTL_MS) return null;
  return entry.adapters;
}

export async function fetchAndCacheAdapterConfig() {
  try {
    const resp = await fetch(ADAPTER_CONFIG_URL);
    if (!resp.ok) return;
    const config = await resp.json();
    if (!config || typeof config.version !== 'number' || !Array.isArray(config.adapters)) return;
    const isValidEntry = (a: unknown) => {
      if (typeof a !== 'object' || a === null) return false;
      const e = a as Record<string, unknown>;
      if (typeof e.domain !== 'string' || e.domain.length === 0) return false;
      if (typeof e.selector !== 'string' || e.selector.length === 0) return false;
      if (!e.selector.startsWith('#') && !e.selector.startsWith('textarea') &&
          !e.selector.startsWith('div[') && !e.selector.startsWith('[')) return false;
      return true;
    };
    if (!config.adapters.every(isValidEntry)) return;
    const existing = await db.adapterConfig.orderBy('id').last();
    if (existing && existing.version >= config.version) return;
    await db.adapterConfig.clear();
    await db.adapterConfig.add({ adapters: config.adapters, version: config.version, fetchedAt: Date.now() });
  } catch (e) {
    console.warn('[glint] adapter config fetch failed:', e);
  }
}

export async function getDomainVariables(domain: string): Promise<string[]> {
  const entries = await db.domainVariables.where('domain').equals(domain).toArray();
  return entries.map(e => e.variableKey);
}

export async function recordDomainVariables(domain: string, keys: string[]) {
  await db.transaction('rw', db.domainVariables, async () => {
    const existing = await db.domainVariables.where('domain').equals(domain).toArray();
    const existingKeys = new Set(existing.map(e => e.variableKey));
    for (const key of keys) {
      if (!existingKeys.has(key)) {
        await db.domainVariables.add({ domain, variableKey: key, createdAt: Date.now() });
      }
    }
  });
}

export async function deleteSavedPrompt(id: number) {
  validateNumber(id, 'id');
  await db.transaction('rw', db.savedPrompts, db.promptVersions, async () => {
    await db.savedPrompts.delete(id);
    await db.promptVersions.where('promptId').equals(id).delete();
  });
}

export async function listCustomChips() {
  return db.customChips.orderBy('createdAt').toArray();
}

export async function saveCustomChip(name: string, label: string, instruction: string) {
  validateString(name, 'name', 100);
  validateString(label, 'label', 50);
  validateString(instruction, 'instruction');
  const count = await db.customChips.count();
  if (count >= 5) throw new Error('Maximum 5 custom chips allowed');
  return db.customChips.add({ name, label, instruction, createdAt: Date.now(), updatedAt: Date.now() });
}

export async function updateCustomChip(id: number, name: string, label: string, instruction: string) {
  validateNumber(id, 'id');
  validateString(name, 'name', 100);
  validateString(label, 'label', 50);
  validateString(instruction, 'instruction');
  await db.customChips.update(id, { name, label, instruction, updatedAt: Date.now() });
}

export async function deleteCustomChip(id: number) {
  validateNumber(id, 'id');
  await db.customChips.delete(id);
}

export async function listBrandVoices() {
  return db.brandVoices.orderBy('name').toArray();
}

export async function getBrandVoiceForDomain(domain: string) {
  validateString(domain, 'domain', 500);
  return db.brandVoices.where('domain').equals(domain).first();
}

export async function saveBrandVoice(name: string, domain: string, tone: string, vocabulary: string[], rules: string[], examples: string[]) {
  validateString(name, 'name', 100);
  validateString(domain, 'domain', 500);
  validateString(tone, 'tone');
  if (!Array.isArray(vocabulary) || !vocabulary.every(v => typeof v === 'string')) throw new Error('vocabulary must be an array of strings');
  if (!Array.isArray(rules) || !rules.every(v => typeof v === 'string')) throw new Error('rules must be an array of strings');
  if (!Array.isArray(examples) || !examples.every(v => typeof v === 'string')) throw new Error('examples must be an array of strings');
  const existing = await db.brandVoices.where('domain').equals(domain).first();
  if (existing) {
    await db.brandVoices.update(existing.id, { name, domain, tone, vocabulary, rules, examples, updatedAt: Date.now() });
    return existing.id;
  }
  return db.brandVoices.add({ name, domain, tone, vocabulary, rules, examples, createdAt: Date.now(), updatedAt: Date.now() });
}

export async function deleteBrandVoice(id: number) {
  validateNumber(id, 'id');
  await db.brandVoices.delete(id);
}

export async function getSetting(key: string): Promise<string | null> {
  validateString(key, 'key', 100);
  const entry = await db.settings.where('key').equals(key).first();
  return entry?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  validateString(key, 'key', 100);
  validateString(value, 'value');
  const existing = await db.settings.where('key').equals(key).first();
  if (existing) await db.settings.update(existing.id, { value });
  else await db.settings.add({ key, value });
}

export async function createABTest(name: string, promptA: string, promptB: string, variables: string) {
  validateString(name, 'name', 200);
  validateString(promptA, 'promptA');
  validateString(promptB, 'promptB');
  validateString(variables, 'variables', 5000);
  return db.abTests.add({ name, promptA, promptB, variables, resultA: '', resultB: '', winner: null, createdAt: Date.now() });
}

export async function listABTests() {
  return db.abTests.orderBy('createdAt').reverse().toArray();
}

export async function updateABTestResult(id: number, resultA: string, resultB: string) {
  validateNumber(id, 'id');
  validateString(resultA, 'resultA');
  validateString(resultB, 'resultB');
  await db.abTests.update(id, { resultA, resultB });
}

export async function markABTestWinner(id: number, winner: 'A' | 'B') {
  validateNumber(id, 'id');
  await db.abTests.update(id, { winner });
}

export async function deleteABTest(id: number) {
  validateNumber(id, 'id');
  await db.abTests.delete(id);
}

export async function getProTier(): Promise<'free' | 'pro'> {
  const tier = await getSetting('pro_tier');
  if (tier === 'pro') return 'pro';
  const expiry = await getSetting('pro_expiry');
  if (expiry && Number(expiry) > Date.now()) return 'pro';
  return 'free';
}

export async function dismissReview() {
  await setSetting('pendingReview', 'false');
}

export async function getStalePrompts(days = 30): Promise<import('./db').SavedPrompt[]> {
  const cutoff = Date.now() - days * 86400000;
  return db.savedPrompts.where('updatedAt').below(cutoff).toArray();
}

export async function getStaleMemory(days = 30): Promise<import('./db').MemoryEntry[]> {
  const cutoff = Date.now() - days * 86400000;
  return db.memory.where('createdAt').below(cutoff).toArray();
}

export async function setReviewAlarm() {
  if (!chrome.alarms) return;
  try {
    await chrome.alarms.create('weeklyReview', { periodInMinutes: 10080 });
    await setSetting('reviewAlarmSet', 'true');
  } catch {
    // alarms API not available (e.g. Firefox)
  }
}

// ── Team Library ──

export async function listTeamMembers() {
  return db.teamMembers.orderBy('addedAt').toArray();
}

export async function addTeamMember(email: string, role: 'viewer' | 'editor' | 'admin') {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email format');
  if (!['viewer', 'editor', 'admin'].includes(role)) throw new Error('Invalid role');
  return db.teamMembers.add({ email, role, addedAt: Date.now() });
}

export async function removeTeamMember(id: number) {
  await db.teamMembers.delete(id);
}

export async function listSharedFolders() {
  return db.sharedFolders.orderBy('createdAt').reverse().toArray();
}

export async function saveSharedFolder(name: string) {
  return db.sharedFolders.add({ name, createdAt: Date.now() });
}

export async function deleteSharedFolder(id: number) {
  await db.sharedFolders.delete(id);
}

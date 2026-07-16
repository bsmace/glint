import type { BackgroundRequest, TelemetryData } from '../shared/messaging';
import { isBackgroundRequest } from '../shared/messaging';
import { saveToMemory, getMemoryStats, listVariables, saveVariable, deleteVariable, listFolders, saveFolder, renameFolder, deleteFolder, savePrompt, listSavedPrompts, deleteSavedPrompt, updatePrompt, listPromptVersions, getPromptVersion, rollbackPrompt, listRecentMemory, saveTelemetry, getLatestTelemetry, getDomainVariables, recordDomainVariables, fetchAndCacheAdapterConfig, getCachedAdapterVersion, listCustomChips, saveCustomChip, updateCustomChip, deleteCustomChip, listBrandVoices, getBrandVoiceForDomain, saveBrandVoice, deleteBrandVoice, getSetting, setSetting, getProTier, createABTest, listABTests, updateABTestResult, markABTestWinner, deleteABTest, dismissReview, getStalePrompts, getStaleMemory, setReviewAlarm, listTeamMembers, addTeamMember, removeTeamMember, listSharedFolders, saveSharedFolder, deleteSharedFolder } from '../shared/services';
import { ADAPTER_REFRESH_MS } from '../shared/constants';
import { isChrome } from '../shared/ai';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((req: unknown, sender, send) => {
    if (sender.id !== chrome.runtime.id) {
      send({ ok: false, error: 'unauthorized' });
      return;
    }
    if (!isBackgroundRequest(req)) {
      send({ ok: false, error: 'invalid request' });
      return;
    }
    (async () => {
      try {
        switch (req.type) {
          case 'saveMemory':
            await saveToMemory(req.content, req.expanded, req.action, req.url);
            send({ ok: true });
            break;
          case 'getMemoryStats':
            send({ ok: true, data: await getMemoryStats() });
            break;
          case 'listVariables':
            send({ ok: true, data: await listVariables() });
            break;
          case 'saveVariable':
            await saveVariable(req.key, req.value, req.description);
            send({ ok: true });
            break;
          case 'deleteVariable':
            await deleteVariable(req.id);
            send({ ok: true });
            break;
          case 'listFolders':
            send({ ok: true, data: await listFolders() });
            break;
          case 'saveFolder':
            await saveFolder(req.name, req.parentId);
            send({ ok: true });
            break;
          case 'renameFolder':
            await renameFolder(req.id, req.name);
            send({ ok: true });
            break;
          case 'deleteFolder':
            await deleteFolder(req.id);
            send({ ok: true });
            break;
          case 'savePrompt':
            await savePrompt(req.title, req.content, req.folderId);
            send({ ok: true });
            break;
          case 'listSavedPrompts':
            send({ ok: true, data: await listSavedPrompts() });
            break;
          case 'deleteSavedPrompt':
            await deleteSavedPrompt(req.id);
            send({ ok: true });
            break;
          case 'listRecentMemory':
            send({ ok: true, data: await listRecentMemory(req.limit) });
            break;
          case 'reportTelemetry':
            const version = await getCachedAdapterVersion();
            await saveTelemetry({ ...req.data, adapterVersion: version ?? undefined });
            send({ ok: true });
            break;
          case 'getTelemetry':
            send({ ok: true, data: await getLatestTelemetry() });
            break;
          case 'getDomainVariables':
            send({ ok: true, data: await getDomainVariables(req.domain) });
            break;
          case 'recordDomainVariables':
            await recordDomainVariables(req.domain, req.keys);
            send({ ok: true });
            break;
          case 'refreshAdapterConfig':
            await fetchAndCacheAdapterConfig();
            send({ ok: true });
            break;
          case 'getAdapterVersion':
            send({ ok: true, data: await getCachedAdapterVersion() });
            break;
          case 'updatePrompt':
            await updatePrompt(req.id, req.title, req.content, req.folderId);
            send({ ok: true });
            break;
          case 'listPromptVersions':
            send({ ok: true, data: await listPromptVersions(req.promptId) });
            break;
          case 'getPromptVersion':
            send({ ok: true, data: await getPromptVersion(req.id) });
            break;
          case 'rollbackPrompt':
            await rollbackPrompt(req.promptId, req.versionId);
            send({ ok: true });
            break;
          case 'listCustomChips':
            send({ ok: true, data: await listCustomChips() });
            break;
          case 'saveCustomChip':
            await saveCustomChip(req.name, req.label, req.instruction);
            send({ ok: true });
            break;
          case 'updateCustomChip':
            await updateCustomChip(req.id, req.name, req.label, req.instruction);
            send({ ok: true });
            break;
          case 'deleteCustomChip':
            await deleteCustomChip(req.id);
            send({ ok: true });
            break;
          case 'listBrandVoices':
            send({ ok: true, data: await listBrandVoices() });
            break;
          case 'getBrandVoiceForDomain':
            send({ ok: true, data: await getBrandVoiceForDomain(req.domain) });
            break;
          case 'saveBrandVoice':
            await saveBrandVoice(req.name, req.domain, req.tone, req.vocabulary, req.rules, req.examples);
            send({ ok: true });
            break;
          case 'deleteBrandVoice':
            await deleteBrandVoice(req.id);
            send({ ok: true });
            break;
          case 'getSetting':
            send({ ok: true, data: await getSetting(req.key) });
            break;
          case 'setSetting':
            await setSetting(req.key, req.value);
            send({ ok: true });
            break;
          case 'getProTier':
            send({ ok: true, data: await getProTier() });
            break;
          case 'createABTest':
            await createABTest(req.name, req.promptA, req.promptB, req.variables);
            send({ ok: true });
            break;
          case 'listABTests':
            send({ ok: true, data: await listABTests() });
            break;
          case 'updateABTestResult':
            await updateABTestResult(req.id, req.resultA, req.resultB);
            send({ ok: true });
            break;
          case 'markABTestWinner':
            await markABTestWinner(req.id, req.winner);
            send({ ok: true });
            break;
          case 'deleteABTest':
            await deleteABTest(req.id);
            send({ ok: true });
            break;
          case 'dismissReview':
            await dismissReview();
            send({ ok: true });
            break;
          case 'getStalePrompts':
            send({ ok: true, data: await getStalePrompts(req.days) });
            break;
          case 'getStaleMemory':
            send({ ok: true, data: await getStaleMemory(req.days) });
            break;
          case 'getReviewStatus':
            send({ ok: true, data: { pending: await getSetting('pendingReview') === 'true' } });
            break;
          case 'listTeamMembers':
            send({ ok: true, data: await listTeamMembers() });
            break;
          case 'addTeamMember':
            await addTeamMember(req.email, req.role);
            send({ ok: true });
            break;
          case 'removeTeamMember':
            await removeTeamMember(req.id);
            send({ ok: true });
            break;
          case 'listSharedFolders':
            send({ ok: true, data: await listSharedFolders() });
            break;
          case 'saveSharedFolder':
            await saveSharedFolder(req.name);
            send({ ok: true });
            break;
          case 'deleteSharedFolder':
            await deleteSharedFolder(req.id);
            send({ ok: true });
            break;
          default:
            send({ ok: false, error: 'unknown request' });
        }
      } catch (e: unknown) {
        send({ ok: false, error: e instanceof Error ? e.message : 'internal error' });
      }
    })();
    return true;
  });

  let retries = 0;
  const tryFetch = async () => {
    const existing = await getCachedAdapterVersion();
    if (existing !== null) { retries = 0; return; }
    await fetchAndCacheAdapterConfig();
    const nowHas = await getCachedAdapterVersion();
    if (nowHas === null && retries < 5) {
      retries++;
      setTimeout(tryFetch, Math.min(30000, 2000 * 2 ** retries));
    }
  };
  tryFetch();
  setInterval(fetchAndCacheAdapterConfig, ADAPTER_REFRESH_MS);

  if (isChrome()) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }

  chrome.commands.onCommand.addListener((cmd) => {
    if (cmd === 'toggle-panel') {
      if (isChrome()) {
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      }
    }
  });

  // Weekly review alarm
  if (isChrome() && chrome.alarms) {
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'weeklyReview') {
        const enabled = await getSetting('reviewEnabled');
        if (enabled !== 'false') {
          await setSetting('pendingReview', 'true');
        }
      }
    });
  }

  (async () => {
    if (!isChrome()) return;
    const alarmSet = await getSetting('reviewAlarmSet');
    const enabled = await getSetting('reviewEnabled');
    if (alarmSet !== 'true' && enabled !== 'false') {
      await setReviewAlarm();
    }
  })();

  // Programmatic injection for m365.cloud.microsoft (Edge blocks declarative CS on MS domains)
  const COPILOT = 'm365.cloud.microsoft';
  const injectedTabs = new Set<number>();

  const inject = async (tabId: number) => {
    if (injectedTabs.has(tabId)) return;
    // Ping content script to check if already injected & alive
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'glint:ping' });
      injectedTabs.add(tabId);
      return;
    } catch {}
    injectedTabs.add(tabId);
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/content.js'],
      world: 'ISOLATED',
    }).catch(() => injectedTabs.delete(tabId));
  };

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes(COPILOT)) inject(tabId);
  });

  // Inject on already-open Copilot tabs at startup
  chrome.tabs.query({ url: `*://${COPILOT}/*` }, (tabs) => {
    for (const t of tabs) if (t.id) inject(t.id);
  });

  chrome.tabs.onRemoved.addListener((tabId) => injectedTabs.delete(tabId));
});

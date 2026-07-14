import type { BackgroundRequest, TelemetryData } from '../shared/messaging';
import { isBackgroundRequest } from '../shared/messaging';
import { saveToMemory, getMemoryStats, listVariables, saveVariable, deleteVariable, listFolders, saveFolder, deleteFolder, savePrompt, listSavedPrompts, deleteSavedPrompt, listRecentMemory, saveTelemetry, getLatestTelemetry } from '../shared/services';

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
            await saveTelemetry(req.data);
            send({ ok: true });
            break;
          case 'getTelemetry':
            send({ ok: true, data: await getLatestTelemetry() });
            break;
          default:
            send({ ok: false, error: 'unknown request' });
        }
      } catch (e: unknown) {
        send({ ok: false, error: 'internal error' });
      }
    })();
    return true;
  });

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  chrome.commands.onCommand.addListener((cmd) => {
    if (cmd === 'toggle-panel') {
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    }
  });

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

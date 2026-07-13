import type { BackgroundRequest, TelemetryData } from '../shared/messaging';
import { saveToMemory, getMemoryStats, listVariables, saveVariable, deleteVariable, listFolders, saveFolder, deleteFolder, savePrompt, listSavedPrompts } from '../shared/services';

let telemetry: TelemetryData = { detectByStrategy: {}, anchorReflowCount: 0, aiLatencyMs: { count: 0, total: 0 } };

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((req: BackgroundRequest, _sender, send) => {
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
          case 'reportTelemetry':
            telemetry = req.data;
            send({ ok: true });
            break;
          case 'getTelemetry':
            send({ ok: true, data: telemetry });
            break;
          default:
            send({ ok: false, error: 'unknown request' });
        }
      } catch (e: unknown) {
        send({ ok: false, error: (e as Error).message });
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
});

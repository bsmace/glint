import type { BackgroundRequest } from '../shared/messaging';
import { saveToMemory, getMemoryStats, listVariables, saveVariable, deleteVariable, listFolders, saveFolder, deleteFolder } from '../shared/services';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((req: BackgroundRequest, _sender, send) => {
    (async () => {
      try {
        switch (req.type) {
          case 'saveMemory':
            await saveToMemory(req.content, req.expanded, req.action);
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

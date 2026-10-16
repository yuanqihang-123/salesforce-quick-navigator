import { browser } from 'wxt/browser';
import { draftService } from '../draftService';
import { SALESFORCE_PATTERNS } from '../backgroundPatterns';
import { reportBackgroundError } from './errors';

export async function openSaveDraft(
  url: string,
  title: string,
  tab: { id: number; windowId: number },
): Promise<void> {
  const draftId = await draftService.create(url, title);
  try {
    // Scope the draft to the clicked tab so other windows keep their normal popup.
    await browser.action.setPopup({ tabId: tab.id, popup: `/popup.html?draft=${draftId}` });
    await browser.action.openPopup({ windowId: tab.windowId });
  } catch (error) {
    await draftService.discard(draftId);
    throw error;
  } finally {
    // The open popup keeps its URL; later toolbar clicks must not reuse a consumed draft.
    await browser.action
      .setPopup({ tabId: tab.id, popup: '/popup.html' })
      .catch(reportBackgroundError);
  }
}

export function registerSaveMenu(): void {
  let menuRegistration: Promise<void> | undefined;
  const ensureSaveMenu = () => {
    // Installation and worker startup can overlap; rebuild only once at a time.
    menuRegistration ??= browser.contextMenus
      .removeAll()
      .then(
        () =>
          new Promise<void>((resolve, reject) => {
            browser.contextMenus.create(
              {
                id: 'save-page',
                title: 'Save to Salesforce Quick Navigator',
                contexts: ['all'],
                documentUrlPatterns: SALESFORCE_PATTERNS.flatMap((pattern) =>
                  ['o', 'r', 'setup'].map((type) =>
                    pattern.replace(/\/\*$/, `/lightning/${type}/*`),
                  ),
                ),
              },
              () => {
                const error = browser.runtime.lastError;
                if (error) reject(new Error(error.message));
                else resolve();
              },
            );
          }),
      )
      .catch(reportBackgroundError)
      .finally(() => {
        menuRegistration = undefined;
      });
  };
  browser.runtime.onInstalled.addListener(ensureSaveMenu);
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'save-page' && info.pageUrl && tab?.id !== undefined) {
      void openSaveDraft(info.pageUrl, tab.title ?? '', {
        id: tab.id,
        windowId: tab.windowId,
      }).catch(reportBackgroundError);
    }
  });
  // Restore a missing menu on worker startup, including extension reloads.
  ensureSaveMenu();
}

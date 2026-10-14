import { browser } from 'wxt/browser';
import { bookmarkSyncService } from './bookmarkSyncService';
export function registerBookmarkBackground(reportError: (error: unknown) => void) {
  const refresh = () => {
    void bookmarkSyncService.sync().catch(reportError);
  };
  let registeredApi: typeof browser.bookmarks | undefined;
  let importing = false;
  const changed = () => {
    if (!importing) refresh();
  };
  const importBegan = () => {
    importing = true;
  };
  const importEnded = () => {
    importing = false;
    refresh();
  };
  function registerEvents() {
    const bookmarks = browser.bookmarks;
    if (!bookmarks || registeredApi) return;
    registeredApi = bookmarks;
    bookmarks.onCreated.addListener(changed);
    bookmarks.onChanged.addListener(changed);
    bookmarks.onRemoved.addListener(changed);
    bookmarks.onMoved.addListener(changed);
    bookmarks.onChildrenReordered.addListener(changed);
    bookmarks.onImportBegan.addListener(importBegan);
    bookmarks.onImportEnded.addListener(importEnded);
  }
  function unregisterEvents() {
    if (!registeredApi) return;
    registeredApi.onCreated.removeListener(changed);
    registeredApi.onChanged.removeListener(changed);
    registeredApi.onRemoved.removeListener(changed);
    registeredApi.onMoved.removeListener(changed);
    registeredApi.onChildrenReordered.removeListener(changed);
    registeredApi.onImportBegan.removeListener(importBegan);
    registeredApi.onImportEnded.removeListener(importEnded);
    registeredApi = undefined;
    importing = false;
  }
  registerEvents();
  browser.permissions.onAdded.addListener((permissions) => {
    if (permissions.permissions?.includes('bookmarks')) {
      registerEvents();
      refresh();
    }
  });
  browser.permissions.onRemoved.addListener((permissions) => {
    if (permissions.permissions?.includes('bookmarks')) {
      unregisterEvents();
      refresh();
    }
  });
  browser.runtime.onStartup.addListener(refresh);
  refresh();
}

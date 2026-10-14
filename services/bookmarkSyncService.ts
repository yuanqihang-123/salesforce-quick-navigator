import { browser } from 'wxt/browser';
import type { AppSettings } from '../types';
import type { BookmarkSyncState } from '../types/bookmarks';
import { collectBookmarks } from './bookmarks/collection';
import { reconcileBookmarks } from './bookmarks/reconciliation';
import { BOOKMARK_SYNC_KEY, bookmarkTransaction, readBookmarkState } from './bookmarks/storage';

async function syncInside(settings: AppSettings, state: BookmarkSyncState) {
  if (!state.enabled) return;
  if (!(await browser.permissions.contains({ permissions: ['bookmarks'] }))) {
    state.enabled = false;
    state.error = 'Bookmark access was removed. Enable sync to allow access again.';
    return;
  }
  if (!settings.projects.some((project) => project.id === state.projectId)) {
    state.enabled = false;
    state.error = 'The bookmark project was deleted. Choose a project and enable sync again.';
    return;
  }
  try {
    const roots = await browser.bookmarks.getChildren('0');
    const bars = roots.filter(
      (node) => node.folderType === 'bookmarks-bar' || (!node.folderType && node.id === '1'),
    );
    const trees = await Promise.all(bars.map((bar) => browser.bookmarks.getSubTree(bar.id)));
    const collected = collectBookmarks(trees.flat(), state.projectId);
    for (const { org } of collected.candidates) {
      if (
        !settings.environments.some(
          (env) =>
            env.projectId === state.projectId &&
            env.orgDomain === org.orgDomain &&
            env.isSandbox === org.isSandbox,
        )
      ) {
        settings.environments.push({
          id: crypto.randomUUID(),
          projectId: state.projectId,
          orgDomain: org.orgDomain,
          isSandbox: org.isSandbox,
          name: (org.environmentName || org.orgDomain).slice(0, 100).toUpperCase(),
        });
      }
    }
    reconcileBookmarks(settings, state, collected.candidates, collected.skipped);
  } catch {
    // A failed read must never masquerade as an empty bookmark bar and delete links.
    state.error = 'Unable to refresh bookmarks. Your Quick Links were kept. Try Refresh now.';
  }
}

export const bookmarkSyncService = {
  async read(): Promise<BookmarkSyncState> {
    const stored = await browser.storage.local.get(BOOKMARK_SYNC_KEY);
    return readBookmarkState(stored[BOOKMARK_SYNC_KEY]);
  },
  async dismiss() {
    await bookmarkTransaction((_settings, state) => {
      state.dismissed = true;
      delete state.error;
    });
  },
  async sync() {
    await bookmarkTransaction(syncInside);
  },
  async enable(projectId: string) {
    await bookmarkTransaction(async (settings, state) => {
      if (!(await browser.permissions.contains({ permissions: ['bookmarks'] })))
        throw new Error('Bookmark access was not granted.');
      if (!settings.projects.some((project) => project.id === projectId))
        throw new Error('Project no longer exists.');
      // Switching destination retains previous imports as ordinary Quick Links.
      if (state.projectId !== projectId) state.bindings = {};
      state.projectId = projectId;
      state.enabled = true;
      state.dismissed = true;
      await syncInside(settings, state);
    });
  },
  async disable(revokePermission = false) {
    await bookmarkTransaction(async (_settings, state) => {
      state.enabled = false;
      state.dismissed = true;
      delete state.error;
      if (revokePermission) {
        try {
          await browser.permissions.remove({ permissions: ['bookmarks'] });
        } catch {
          state.error =
            'Sync is off, but bookmark access could not be removed. Remove it in the browser extension settings.';
        }
      }
    });
  },
  subscribe(listener: () => void) {
    const handler = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && BOOKMARK_SYNC_KEY in changes) listener();
    };
    browser.storage.onChanged.addListener(handler);
    return () => browser.storage.onChanged.removeListener(handler);
  },
};

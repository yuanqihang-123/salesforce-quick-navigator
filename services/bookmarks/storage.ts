import { browser } from 'wxt/browser';
import { defaultSettings, type AppSettings } from '../../types';
import { defaultBookmarkSyncState, type BookmarkSyncState } from '../../types/bookmarks';
import { validateSettings } from '../validation';
import { SETTINGS_KEY, STORAGE_LOCK } from '../storageService';

export const BOOKMARK_SYNC_KEY = 'bookmarkSync';

// Browser-specific IDs and consent stay local and never enter portable backups.
export function readBookmarkState(value: unknown): BookmarkSyncState {
  if (value === undefined) return defaultBookmarkSyncState();
  if (!value || typeof value !== 'object') throw new Error('Invalid bookmark sync settings.');
  const data = value as BookmarkSyncState;
  if (
    typeof data.enabled !== 'boolean' ||
    typeof data.dismissed !== 'boolean' ||
    typeof data.projectId !== 'string' ||
    !data.bindings ||
    typeof data.bindings !== 'object' ||
    !Number.isSafeInteger(data.matched) ||
    data.matched < 0 ||
    !Number.isSafeInteger(data.skipped) ||
    data.skipped < 0
  )
    throw new Error('Invalid bookmark sync settings.');
  for (const binding of Object.values(data.bindings)) {
    if (
      !binding ||
      typeof binding.linkId !== 'string' ||
      typeof binding.snapshot !== 'string' ||
      typeof binding.owned !== 'boolean' ||
      (binding.ignored !== undefined && typeof binding.ignored !== 'boolean')
    )
      throw new Error('Invalid bookmark sync binding.');
  }
  return data;
}
export async function bookmarkTransaction<T>(
  operation: (settings: AppSettings, state: BookmarkSyncState) => Promise<T> | T,
): Promise<T> {
  return navigator.locks.request(STORAGE_LOCK, async () => {
    const stored = await browser.storage.local.get([SETTINGS_KEY, BOOKMARK_SYNC_KEY]);
    const settings =
      stored[SETTINGS_KEY] === undefined
        ? defaultSettings()
        : validateSettings(stored[SETTINGS_KEY]);
    const state = readBookmarkState(stored[BOOKMARK_SYNC_KEY]);
    const beforeSettings = JSON.stringify(settings);
    const beforeState = JSON.stringify(state);
    const result = await operation(settings, state);
    const changes: Record<string, unknown> = {};
    if (JSON.stringify(settings) !== beforeSettings)
      changes[SETTINGS_KEY] = validateSettings(settings);
    if (JSON.stringify(state) !== beforeState) changes[BOOKMARK_SYNC_KEY] = state;
    if (Object.keys(changes).length) await browser.storage.local.set(changes);
    return result;
  });
}

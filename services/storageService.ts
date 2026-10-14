import { browser } from 'wxt/browser';
import { defaultSettings, type AppSettings } from '../types';
import { validateSettings } from './validation';
export const SETTINGS_KEY = 'settings';
export const STORAGE_LOCK = 'quick-navigator-storage';
export const storageService = {
  async read(): Promise<AppSettings> {
    const stored = await browser.storage.local.get(SETTINGS_KEY);
    return stored[SETTINGS_KEY] === undefined
      ? defaultSettings()
      : validateSettings(stored[SETTINGS_KEY]);
  },
  async mutate<T>(operation: (settings: AppSettings) => T): Promise<T> {
    // Web Locks are shared across popup/options at the extension origin.
    return navigator.locks.request(STORAGE_LOCK, async () => {
      const settings = await storageService.read();
      const result = operation(settings);
      await browser.storage.local.set({ [SETTINGS_KEY]: validateSettings(settings) });
      return result;
    });
  },
  subscribe(listener: () => void): () => void {
    const handler = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && SETTINGS_KEY in changes) listener();
    };
    browser.storage.onChanged.addListener(handler);
    return () => browser.storage.onChanged.removeListener(handler);
  },
};

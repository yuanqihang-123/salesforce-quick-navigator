import { browser } from 'wxt/browser';
import { environmentService } from '../environmentService';
import { reportBackgroundError } from './errors';

export async function captureTab(tab: { url?: string }): Promise<void> {
  if (tab.url) await environmentService.remember(tab.url);
}

export function registerTabObserver(): void {
  browser.tabs.onUpdated.addListener((_id, changes, tab) => {
    if (changes.url || changes.status === 'complete')
      void captureTab(tab).catch(reportBackgroundError);
  });
  browser.tabs.onActivated.addListener(({ tabId }) => {
    void browser.tabs.get(tabId).then(captureTab).catch(reportBackgroundError);
  });
}

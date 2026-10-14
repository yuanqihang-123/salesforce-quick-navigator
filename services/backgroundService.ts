import { browser } from 'wxt/browser';
import { registerBookmarkBackground } from './bookmarkBackground';
import { registerSaveMenu } from './background/contextMenu';
import { reportBackgroundError } from './background/errors';
import { registerBackgroundMessages } from './background/messages';
import { registerTabObserver } from './background/tabObserver';

export function registerBackground(): void {
  // Register every listener before starting asynchronous work so restarted workers receive events.
  registerBackgroundMessages();
  registerSaveMenu();
  registerTabObserver();
  registerBookmarkBackground(reportBackgroundError);
  void browser.storage.local
    .setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
    .catch(reportBackgroundError);
}

import { browser } from 'wxt/browser';
import type { BackgroundRequest, BackgroundResponse } from '../../types/messages';
import { errorText } from '../../utils/errorText';
import { bookmarkSyncService } from '../bookmarkSyncService';
import { navigationService } from '../navigationService';
import { storageService } from '../storageService';
import { id, record } from '../validation/primitives';

function parseRequest(message: unknown): BackgroundRequest {
  const request = record(message);
  if (request.type === 'open-quick-link' && typeof request.targetId === 'string') {
    return {
      type: request.type,
      linkId: id(request.linkId),
      projectId: id(request.projectId),
      targetId: request.targetId === '' ? '' : id(request.targetId),
    };
  }
  if (request.type === 'bookmark-sync') {
    if (request.action === 'enable')
      return { type: request.type, action: request.action, projectId: id(request.projectId) };
    if (request.action === 'refresh' || request.action === 'disable')
      return { type: request.type, action: request.action };
  }
  throw new Error('Invalid background request.');
}

function isTrustedSender(sender: { id?: string; url?: string; tab?: unknown }): boolean {
  // Only packaged UI pages may initiate privileged actions; content scripts have a tab.
  if (sender.id !== browser.runtime.id || sender.tab !== undefined || !sender.url) return false;
  try {
    const url = new URL(sender.url);
    const extension = new URL(browser.runtime.getURL('/'));
    return (
      url.protocol === extension.protocol &&
      url.host === extension.host &&
      !url.username &&
      !url.password &&
      ['/popup.html', '/options.html'].includes(url.pathname)
    );
  } catch {
    return false;
  }
}

export async function handleBackgroundMessage(message: unknown): Promise<BackgroundResponse> {
  try {
    const request = parseRequest(message);
    if (request.type === 'open-quick-link') {
      const link = (await storageService.read()).quickLinks.find(
        (item) => item.id === request.linkId && item.projectId === request.projectId,
      );
      if (!link) throw new Error('Link no longer exists in this project.');
      await navigationService.openLink(link, request.projectId, request.targetId);
    } else if (request.action === 'enable') {
      await bookmarkSyncService.enable(request.projectId);
    } else if (request.action === 'refresh') {
      await bookmarkSyncService.sync();
    } else {
      await bookmarkSyncService.disable(true);
    }
    return { ok: true };
  } catch (failure) {
    return { ok: false, error: errorText(failure) };
  }
}

export function registerBackgroundMessages(): void {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      !message ||
      typeof message !== 'object' ||
      !['bookmark-sync', 'open-quick-link'].includes(message.type)
    )
      return;
    if (!isTrustedSender(sender)) {
      sendResponse({ ok: false, error: 'Untrusted background request.' });
      return;
    }
    // Keep the worker/channel alive through navigation and persistence if the popup closes.
    void handleBackgroundMessage(message).then(sendResponse);
    return true;
  });
}

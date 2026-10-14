import { beforeEach, expect, it, vi } from 'vitest';
import { resetChrome, chromeMock } from './chromeMock';
import { registerBackground } from '../services/backgroundService';
import { captureTab } from '../services/background/tabObserver';
import { openSaveDraft } from '../services/background/contextMenu';
import { draftService } from '../services/draftService';
import { storageService } from '../services/storageService';
import { SALESFORCE_PATTERNS } from '../services/backgroundPatterns';
beforeEach(resetChrome);
it('observes supported domains and ignores non-Salesforce pages', async () => {
  await captureTab({ url: 'https://app--dev.sandbox.lightning.force.com/' });
  await captureTab({ url: 'https://example.com/' });
  await captureTab({});
  expect((await storageService.read()).environments).toHaveLength(1);
});
it('right-click prepares a session-only draft without saving a link', async () => {
  await openSaveDraft(
    'https://app.my.salesforce.com/lightning/o/Account/list?filterName=Recent#x',
    'My Accounts',
    { id: 42, windowId: 7 },
  );
  expect((await storageService.read()).quickLinks).toEqual([]);
  expect(chromeMock.create).not.toHaveBeenCalled();
  expect(chromeMock.openOptionsPage).not.toHaveBeenCalled();
  expect(chromeMock.openPopup).toHaveBeenCalledWith({ windowId: 7 });
  const destination = chromeMock.setPopup.mock.calls[0]?.[0] as { tabId: number; popup: string };
  expect(destination.tabId).toBe(42);
  expect(destination.popup).toMatch(/^\/popup.html\?draft=/);
  const id = new URL(destination.popup, 'https://extension.test').searchParams.get('draft')!;
  expect(chromeMock.setPopup).toHaveBeenLastCalledWith({ tabId: 42, popup: '/popup.html' });
  expect(await draftService.consume(id)).toMatchObject({
    name: 'My Accounts',
    route: '/lightning/o/Account/list?filterName=Recent#x',
  });
  await expect(draftService.consume(id)).rejects.toThrow();
});
it('rejects unsupported context-menu routes without opening a tab', async () => {
  await expect(
    openSaveDraft('https://app.lightning.force.com/apex/unsafe', 'Page', { id: 42, windowId: 7 }),
  ).rejects.toThrow();
  expect(chromeMock.create).not.toHaveBeenCalled();
  expect(chromeMock.openPopup).not.toHaveBeenCalled();
  expect(chromeMock.setPopup).not.toHaveBeenCalled();
});
it('restores the normal popup and discards the draft when opening fails', async () => {
  chromeMock.openPopup.mockRejectedValueOnce(new Error('Window is not focused'));
  await expect(
    openSaveDraft('https://app.lightning.force.com/lightning/o/Account/list', 'Page', {
      id: 42,
      windowId: 7,
    }),
  ).rejects.toThrow('Window is not focused');
  const destination = chromeMock.setPopup.mock.calls[0]?.[0] as { popup: string };
  const id = new URL(destination.popup, 'https://extension.test').searchParams.get('draft')!;
  await expect(draftService.consume(id)).rejects.toThrow();
  expect(chromeMock.setPopup).toHaveBeenLastCalledWith({ tabId: 42, popup: '/popup.html' });
  expect(chromeMock.create).not.toHaveBeenCalled();
});
it('opens the save popup in the window of the right-clicked tab', async () => {
  registerBackground();
  const listener = chromeMock.events.menu.addListener.mock.calls[0]![0] as (
    info: unknown,
    tab: unknown,
  ) => void;
  listener(
    {
      menuItemId: 'save-page',
      pageUrl: 'https://app.lightning.force.com/lightning/o/Account/list',
    },
    { id: 99, windowId: 12, title: 'Clicked page' },
  );
  await vi.waitFor(() => expect(chromeMock.openPopup).toHaveBeenCalledWith({ windowId: 12 }));
  expect(chromeMock.setPopup.mock.calls[0]?.[0]).toMatchObject({ tabId: 99 });
  expect(chromeMock.create).not.toHaveBeenCalled();
});
it('registers all service-worker listeners synchronously and scopes menus to supported routes', async () => {
  registerBackground();
  for (const event of Object.values(chromeMock.events))
    expect(event.addListener).toHaveBeenCalledOnce();
  expect(chromeMock.setAccessLevel).toHaveBeenCalledWith({ accessLevel: 'TRUSTED_CONTEXTS' });
  const installed = chromeMock.events.installed.addListener.mock.calls[0]![0] as () => void;
  installed();
  await vi.waitFor(() => expect(chromeMock.menuCreate).toHaveBeenCalledOnce());
  const menu = chromeMock.menuCreate.mock.calls[0]![0] as { documentUrlPatterns: string[] };
  expect(menu.documentUrlPatterns).toEqual(
    SALESFORCE_PATTERNS.flatMap((pattern) =>
      ['o', 'r', 'setup'].map((type) => `${pattern.slice(0, -2)}/lightning/${type}/*`),
    ),
  );
  expect(chromeMock.menuRemoveAll).toHaveBeenCalledOnce();
});

it('restores the save menu on worker startup without an installation event', async () => {
  registerBackground();
  await vi.waitFor(() => expect(chromeMock.menuCreate).toHaveBeenCalledOnce());
  expect(chromeMock.menuCreate.mock.calls[0]?.[0]).toMatchObject({
    id: 'save-page',
    contexts: ['page'],
    documentUrlPatterns: expect.arrayContaining(['https://*.lightning.force.com/lightning/o/*']),
  });
});

it('keeps the message channel alive until the open count has been persisted', async () => {
  const { quickLinkService } = await import('../services/quickLinkService');
  const { input } = await import('./chromeMock');
  const link = await quickLinkService.create(input);
  chromeMock.query.mockResolvedValue([{ url: 'https://app.lightning.force.com/' }]);
  registerBackground();
  const listener = chromeMock.events.message.addListener.mock.calls[0]![0] as (
    message: unknown,
    sender: unknown,
    respond: (response: unknown) => void,
  ) => boolean | undefined;
  const response = vi.fn();
  expect(
    listener(
      { type: 'open-quick-link', linkId: link.id, projectId: 'default', targetId: '' },
      { id: 'test', url: 'chrome-extension://test/popup.html?draft=example' },
      response,
    ),
  ).toBe(true);
  await vi.waitFor(() => expect(response).toHaveBeenCalledWith({ ok: true }));
  expect((await quickLinkService.getById(link.id))?.openCount).toBe(1);
  expect(listener({ type: 'unrelated' }, {}, response)).toBeUndefined();
});

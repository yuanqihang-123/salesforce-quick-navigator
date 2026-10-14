import { beforeEach, expect, it, vi } from 'vitest';
import { chromeMock, input, resetChrome } from './chromeMock';
import { registerBackgroundMessages } from '../services/background/messages';
import { quickLinkService } from '../services/quickLinkService';
import { bookmarkSyncService } from '../services/bookmarkSyncService';

beforeEach(resetChrome);

function listener() {
  registerBackgroundMessages();
  return chromeMock.events.message.addListener.mock.calls[0]![0] as (
    message: unknown,
    sender: unknown,
    respond: (response: unknown) => void,
  ) => boolean | undefined;
}
const popup = { id: 'test', url: 'chrome-extension://test/popup.html' };

it.each([
  {},
  { ...popup, id: 'another-extension' },
  { ...popup, url: 'https://example.com/popup.html' },
  { ...popup, url: 'chrome-extension://another-extension/popup.html' },
  { ...popup, url: 'chrome-extension://test/unexpected.html' },
  { ...popup, url: 'invalid-url' },
  { ...popup, tab: { id: 1 } },
])('rejects an untrusted sender without reading or changing user data: %j', (sender) => {
  const receive = listener();
  const respond = vi.fn();
  expect(receive({ type: 'bookmark-sync', action: 'disable' }, sender, respond)).toBeUndefined();
  expect(respond).toHaveBeenCalledWith({ ok: false, error: 'Untrusted background request.' });
  expect(chromeMock.get).not.toHaveBeenCalled();
  expect(chromeMock.set).not.toHaveBeenCalled();
  expect(chromeMock.permissionRemove).not.toHaveBeenCalled();
  expect(chromeMock.create).not.toHaveBeenCalled();
});

it.each([
  { type: 'open-quick-link', linkId: '', projectId: 'default', targetId: '' },
  { type: 'open-quick-link', linkId: 'link', projectId: 1, targetId: '' },
  { type: 'open-quick-link', linkId: 'link', projectId: 'default', targetId: null },
  { type: 'open-quick-link', linkId: 'link', projectId: 'default', targetId: ' ' },
  { type: 'bookmark-sync', action: 'enable' },
  { type: 'bookmark-sync', action: 'unexpected' },
])('rejects a malformed UI request before any privileged action: %j', async (message) => {
  const receive = listener();
  const respond = vi.fn();
  expect(receive(message, popup, respond)).toBe(true);
  await vi.waitFor(() =>
    expect(respond).toHaveBeenCalledWith({ ok: false, error: expect.any(String) }),
  );
  expect(chromeMock.get).not.toHaveBeenCalled();
  expect(chromeMock.set).not.toHaveBeenCalled();
  expect(chromeMock.create).not.toHaveBeenCalled();
  expect(chromeMock.permissionRemove).not.toHaveBeenCalled();
});

it('accepts the options page and completes disabling sync before responding', async () => {
  chromeMock.permissionGranted = true;
  await bookmarkSyncService.enable('default');
  const receive = listener();
  const respond = vi.fn();
  expect(
    receive(
      { type: 'bookmark-sync', action: 'disable' },
      { ...popup, url: 'chrome-extension://test/options.html' },
      respond,
    ),
  ).toBe(true);
  await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: true }));
  expect((await bookmarkSyncService.read()).enabled).toBe(false);
  expect(chromeMock.permissionGranted).toBe(false);
});

it('returns navigation errors without incrementing the count, so the popup can retry', async () => {
  const link = await quickLinkService.create(input);
  chromeMock.query.mockResolvedValue([{ url: 'https://app.lightning.force.com/' }]);
  chromeMock.create.mockRejectedValueOnce(new Error('Tab could not be opened'));
  const receive = listener();
  const respond = vi.fn();
  const message = { type: 'open-quick-link', linkId: link.id, projectId: 'default', targetId: '' };
  expect(receive(message, popup, respond)).toBe(true);
  await vi.waitFor(() =>
    expect(respond).toHaveBeenCalledWith({ ok: false, error: 'Tab could not be opened' }),
  );
  expect((await quickLinkService.getById(link.id))?.openCount).toBe(0);
  respond.mockClear();
  expect(receive(message, popup, respond)).toBe(true);
  await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: true }));
  expect((await quickLinkService.getById(link.id))?.openCount).toBe(1);
});

it('leaves unrelated messages unanswered', () => {
  const receive = listener();
  const respond = vi.fn();
  for (const message of [null, [], 'text', { type: 'unrelated' }])
    expect(receive(message, popup, respond)).toBeUndefined();
  expect(respond).not.toHaveBeenCalled();
});

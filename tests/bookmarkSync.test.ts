import { beforeEach, expect, it, vi } from 'vitest';
import { chromeMock, resetChrome, input } from './chromeMock';
import { bookmarkSyncService } from '../services/bookmarkSyncService';
import type { BookmarkNode } from '../types/bookmarks';
import { registerBookmarkBackground } from '../services/bookmarkBackground';
import { handleBackgroundMessage } from '../services/background/messages';
import { storageService } from '../services/storageService';
import { quickLinkService } from '../services/quickLinkService';
import { projectService } from '../services/projectService';
import { importExportService } from '../services/importExportService';
import { navigationService } from '../services/navigationService';

beforeEach(resetChrome);
const url = 'https://company.lightning.force.com/lightning/o/Account/list?filterName=Recent#x';
const bookmark = (id = '10', overrides: Partial<BookmarkNode> = {}): BookmarkNode => ({
  id,
  title: 'My Accounts',
  url,
  ...overrides,
});
function bar(children: BookmarkNode[]) {
  chromeMock.bookmarkGetSubTree.mockResolvedValue([{ id: '1', title: 'Bookmarks bar', children }]);
}
async function enable() {
  chromeMock.permissionGranted = true;
  await bookmarkSyncService.enable('default');
}

it('does not read bookmarks or ask permission until explicitly enabled', async () => {
  await bookmarkSyncService.sync();
  expect(chromeMock.permissionRequest).not.toHaveBeenCalled();
  expect(chromeMock.bookmarkGetChildren).not.toHaveBeenCalled();
  await expect(bookmarkSyncService.enable('default')).rejects.toThrow('not granted');
  expect((await storageService.read()).quickLinks).toEqual([]);
});

it('reads nested bookmark bars only, converts routes, deduplicates across Orgs and imports environments', async () => {
  chromeMock.bookmarkGetChildren.mockResolvedValue([
    { id: '1', folderType: 'bookmarks-bar' },
    { id: '20', folderType: 'bookmarks-bar' },
    { id: '2', folderType: 'other' },
    { id: '3', folderType: 'mobile' },
  ]);
  chromeMock.bookmarkGetSubTree.mockImplementation(async (id: string) => [
    {
      id,
      children:
        id === '1'
          ? [
              {
                id: 'folder',
                title: 'Work',
                children: [{ id: 'nested', title: 'CRM', children: [bookmark()] }],
              },
              bookmark('bad', {
                url: 'https://company.lightning.force.com.attacker.example/lightning/o/Account/list',
              }),
              bookmark('external', { url: 'https://example.com/Salesforce' }),
            ]
          : [
              bookmark('duplicate', {
                url: url.replace(
                  'company.lightning.force.com',
                  'company--uat.sandbox.my.salesforce.com',
                ),
              }),
            ],
    },
  ]);
  await enable();
  const settings = await storageService.read();
  expect(settings.quickLinks).toHaveLength(1);
  expect(settings.quickLinks[0]).toMatchObject({
    name: 'My Accounts',
    category: 'Work / CRM',
    route: '/lightning/o/Account/list?filterName=Recent#x',
    projectId: 'default',
  });
  expect(settings.environments).toHaveLength(2);
  expect(settings.environments.every((env) => !env.lastVisitedAt)).toBe(true);
  expect(chromeMock.bookmarkGetSubTree.mock.calls.map(([id]) => id)).toEqual(['1', '20']);
  expect((await bookmarkSyncService.read()).matched).toBe(2);
});

it('supports legacy Chrome bookmark-bar IDs without localized folder names', async () => {
  chromeMock.bookmarkGetChildren.mockResolvedValue([
    { id: '1', title: '书签栏' },
    { id: '2', title: '其他书签' },
  ]);
  bar([bookmark()]);
  await enable();
  expect((await storageService.read()).quickLinks).toHaveLength(1);
  expect(chromeMock.bookmarkGetSubTree).toHaveBeenCalledWith('1');
});

it('updates bookmark name, folder and route while retaining link ID, favorites, count and order', async () => {
  bar([bookmark()]);
  await enable();
  const original = (await storageService.read()).quickLinks[0]!;
  await storageService.mutate((settings) => {
    settings.quickLinks[0]!.favorite = true;
    settings.quickLinks[0]!.openCount = 8;
  });
  bar([
    {
      id: 'folder',
      title: 'Sales',
      children: [bookmark('10', { title: 'Contacts', url: url.replace('/Account/', '/Contact/') })],
    },
  ]);
  await bookmarkSyncService.sync();
  expect((await storageService.read()).quickLinks[0]).toMatchObject({
    id: original.id,
    favorite: true,
    openCount: 8,
    sortOrder: original.sortOrder,
    name: 'Contacts',
    category: 'Sales',
    route: '/lightning/o/Contact/list?filterName=Recent#x',
  });
  bar([]);
  await bookmarkSyncService.sync();
  expect((await storageService.read()).quickLinks).toEqual([]);
});

it('leaves an existing manual duplicate alone, even when its bookmark is renamed or removed', async () => {
  const manual = await quickLinkService.create({
    ...input,
    route: '/lightning/o/Account/list?filterName=Recent#x',
  });
  bar([bookmark()]);
  await enable();
  bar([bookmark('10', { title: 'Bookmark renamed' })]);
  await bookmarkSyncService.sync();
  expect((await storageService.read()).quickLinks).toEqual([manual]);
  bar([]);
  await bookmarkSyncService.sync();
  expect((await storageService.read()).quickLinks).toEqual([manual]);
});

it('does not overwrite manual edits or resurrect manually deleted imported links', async () => {
  bar([bookmark(), bookmark('second', { url: url.replace('/Account/', '/Contact/') })]);
  await enable();
  const [edited, deleted] = (await storageService.read()).quickLinks;
  await quickLinkService.update(edited!.id, { name: 'My own name', description: 'Keep this' });
  await quickLinkService.delete(deleted!.id);
  bar([
    bookmark('10', { title: 'New bookmark name' }),
    bookmark('second', { url: url.replace('/Account/', '/Contact/') }),
  ]);
  await bookmarkSyncService.sync();
  await bookmarkSyncService.sync();
  expect((await storageService.read()).quickLinks).toHaveLength(1);
  expect((await storageService.read()).quickLinks[0]).toMatchObject({
    name: 'My own name',
    description: 'Keep this',
  });
  bar([]);
  await bookmarkSyncService.sync();
  expect((await storageService.read()).quickLinks).toHaveLength(1);
});

it('splits changed duplicate sources and merges converging routes without losing the unaffected link', async () => {
  bar([bookmark(), bookmark('copy')]);
  await enable();
  const original = (await storageService.read()).quickLinks[0]!;
  bar([bookmark('10', { url: url.replace('/Account/', '/Contact/') }), bookmark('copy')]);
  await bookmarkSyncService.sync();
  expect((await storageService.read()).quickLinks).toHaveLength(2);
  expect((await quickLinkService.getById(original.id))?.route).toBe(original.route);
  bar([bookmark(), bookmark('copy')]);
  await bookmarkSyncService.sync();
  expect((await storageService.read()).quickLinks).toHaveLength(1);
  expect((await storageService.read()).quickLinks[0]!.id).toBe(original.id);
});

it('retains links on failed reads, disable and permission revocation', async () => {
  bar([bookmark()]);
  await enable();
  const saved = (await storageService.read()).quickLinks;
  chromeMock.bookmarkGetSubTree.mockRejectedValueOnce(new Error('Cannot read bookmarks'));
  await bookmarkSyncService.sync();
  expect((await storageService.read()).quickLinks).toEqual(saved);
  expect((await bookmarkSyncService.read()).error).toContain('kept');
  chromeMock.permissionGranted = false;
  await bookmarkSyncService.sync();
  expect((await bookmarkSyncService.read()).enabled).toBe(false);
  expect((await storageService.read()).quickLinks).toEqual(saved);
  await handleBackgroundMessage({ type: 'bookmark-sync', action: 'disable' });
  expect(chromeMock.permissionRemove).toHaveBeenCalledWith({ permissions: ['bookmarks'] });
  chromeMock.bookmarkGetChildren.mockClear();
  await bookmarkSyncService.sync();
  expect(chromeMock.bookmarkGetChildren).not.toHaveBeenCalled();
  expect((await storageService.read()).quickLinks).toEqual(saved);
});

it('imports into the chosen project and stops when that project is deleted', async () => {
  const project = await projectService.create('Work');
  bar([bookmark()]);
  chromeMock.permissionGranted = true;
  await bookmarkSyncService.enable(project.id);
  expect((await storageService.read()).quickLinks[0]?.projectId).toBe(project.id);
  await projectService.delete(project.id);
  await bookmarkSyncService.sync();
  expect((await bookmarkSyncService.read()).enabled).toBe(false);
  expect((await storageService.read()).quickLinks).toEqual([]);
});

it('backs up Quick Links without copying consent or browser-specific source IDs', async () => {
  bar([bookmark()]);
  await enable();
  const json = await importExportService.exportJson();
  expect(json).not.toContain('bookmarkSync');
  expect(json).not.toContain('bindings');
  const backup = JSON.parse(json);
  await importExportService.importJson(
    JSON.stringify({ ...backup, bookmarkSync: { enabled: true } }),
    'replace',
  );
  expect((await storageService.read()).quickLinks).toHaveLength(1);
});

it('imports home, Classic and Visualforce paths as editable Quick Links with the right domain', async () => {
  bar([
    bookmark('home', { url: 'https://company.lightning.force.com/' }),
    bookmark('classic', { url: 'https://company.my.salesforce.com/001?fcf=Recent#list' }),
    bookmark('apex', { url: 'https://company.my.salesforce.com/apex/Work' }),
    bookmark('setup', {
      url: 'https://company.my.salesforce-setup.com/setup/forcecomHomepage.apexp',
    }),
    bookmark('unsafe', { url: 'https://company.my.salesforce.com/apex/%5cunsafe' }),
  ]);
  await enable();
  const settings = await storageService.read();
  expect(settings.quickLinks).toHaveLength(4);
  const classic = settings.quickLinks.find((link) => link.route.startsWith('/001'))!;
  await quickLinkService.update(classic.id, { name: 'Classic accounts' });
  await navigationService.openLink(classic, 'default', settings.environments[0]!.id);
  expect(chromeMock.create).toHaveBeenCalledWith({
    url: 'https://company.my.salesforce.com/001?fcf=Recent#list',
  });
  expect((await quickLinkService.getById(classic.id))?.openCount).toBe(1);
  const json = await importExportService.exportJson();
  await importExportService.importJson(json, 'replace');
  expect((await storageService.read()).quickLinks).toHaveLength(4);
});

it('serializes overlapping sync and disable without re-enabling or losing user changes', async () => {
  bar([bookmark()]);
  await enable();
  let release!: (value: BookmarkNode[]) => void;
  chromeMock.bookmarkGetSubTree.mockImplementationOnce(
    () =>
      new Promise<BookmarkNode[]>((resolve) => {
        release = resolve;
      }),
  );
  const pendingSync = bookmarkSyncService.sync();
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  const disable = bookmarkSyncService.disable();
  const manual = quickLinkService.create({ ...input, route: '/lightning/o/Lead/list' });
  release([{ id: '1', title: 'Bookmarks bar', children: [bookmark()] }]);
  await Promise.all([pendingSync, disable, manual]);
  expect((await bookmarkSyncService.read()).enabled).toBe(false);
  expect((await storageService.read()).quickLinks).toHaveLength(2);
});

it('registers events synchronously and refreshes after bookmark import, startup and permission changes', async () => {
  const sync = vi.spyOn(bookmarkSyncService, 'sync').mockResolvedValue();
  try {
    registerBookmarkBackground(vi.fn());
    for (const event of Object.values(chromeMock.bookmarkEvents))
      expect(event.addListener).toHaveBeenCalledOnce();
    const began = chromeMock.bookmarkEvents.importBegan!.addListener.mock
      .calls[0]![0] as () => void;
    const created = chromeMock.bookmarkEvents.created!.addListener.mock.calls[0]![0] as () => void;
    const ended = chromeMock.bookmarkEvents.importEnded!.addListener.mock
      .calls[0]![0] as () => void;
    sync.mockClear();
    began();
    created();
    expect(sync).not.toHaveBeenCalled();
    ended();
    expect(sync).toHaveBeenCalledOnce();
    for (const name of ['changed', 'removed', 'moved', 'reordered'])
      (chromeMock.bookmarkEvents[name]!.addListener.mock.calls[0]![0] as () => void)();
    (chromeMock.events.startup.addListener.mock.calls[0]![0] as () => void)();
    (chromeMock.permissionRemoved.addListener.mock.calls[0]![0] as (value: unknown) => void)({
      permissions: ['bookmarks'],
    });
    expect(sync).toHaveBeenCalledTimes(7);
    for (const event of Object.values(chromeMock.bookmarkEvents))
      expect(event.removeListener).toHaveBeenCalledOnce();
    (chromeMock.permissionAdded.addListener.mock.calls[0]![0] as (value: unknown) => void)({
      permissions: ['bookmarks'],
    });
    for (const event of Object.values(chromeMock.bookmarkEvents))
      expect(event.addListener).toHaveBeenCalledTimes(2);
  } finally {
    sync.mockRestore();
  }
});

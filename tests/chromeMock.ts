import { vi } from 'vitest';
const chromeMock = vi.hoisted(() => {
  const listeners = new Set<(changes: Record<string, unknown>, area: string) => void>();
  const state: Record<string, unknown> = {};
  const get = vi.fn(async (key: string | string[]) =>
    structuredClone(
      Object.fromEntries((Array.isArray(key) ? key : [key]).map((name) => [name, state[name]])),
    ),
  );
  const set = vi.fn(async (data: Record<string, unknown>) => {
    Object.assign(state, structuredClone(data));
    for (const listener of listeners) listener(data, 'local');
  });
  const events = {
    installed: { addListener: vi.fn() },
    startup: { addListener: vi.fn() },
    message: { addListener: vi.fn() },
    updated: { addListener: vi.fn() },
    activated: { addListener: vi.fn() },
    menu: { addListener: vi.fn() },
  };
  const bookmarkEvents = Object.fromEntries(
    ['created', 'changed', 'removed', 'moved', 'reordered', 'importBegan', 'importEnded'].map(
      (name) => [name, { addListener: vi.fn(), removeListener: vi.fn() }],
    ),
  );
  return {
    events,
    bookmarkEvents,
    permissionAdded: { addListener: vi.fn() },
    permissionRemoved: { addListener: vi.fn() },
    permissionGranted: false,
    permissionRequest: vi.fn(),
    permissionContains: vi.fn(),
    permissionRemove: vi.fn(),
    bookmarkGetChildren: vi.fn(),
    bookmarkGetSubTree: vi.fn(),
    tabGet: vi.fn(),
    menuRemoveAll: vi.fn(async () => {}),
    menuCreate: vi.fn((_properties: unknown, callback?: () => void) => callback?.()),
    state,
    sessionGet: vi.fn(),
    sessionSet: vi.fn(),
    sessionRemove: vi.fn(),
    listeners,
    get,
    set,
    setAccessLevel: vi.fn(async () => {}),
    query: vi.fn(),
    create: vi.fn(),
    setPopup: vi.fn(),
    openPopup: vi.fn(),
    openOptionsPage: vi.fn(),
    sendMessage: vi.fn(),
  };
});
export { chromeMock };
vi.mock('wxt/browser', () => ({
  browser: {
    permissions: {
      request: chromeMock.permissionRequest,
      contains: chromeMock.permissionContains,
      remove: chromeMock.permissionRemove,
      onAdded: chromeMock.permissionAdded,
      onRemoved: chromeMock.permissionRemoved,
    },
    bookmarks: {
      getChildren: chromeMock.bookmarkGetChildren,
      getSubTree: chromeMock.bookmarkGetSubTree,
      onCreated: chromeMock.bookmarkEvents.created,
      onChanged: chromeMock.bookmarkEvents.changed,
      onRemoved: chromeMock.bookmarkEvents.removed,
      onMoved: chromeMock.bookmarkEvents.moved,
      onChildrenReordered: chromeMock.bookmarkEvents.reordered,
      onImportBegan: chromeMock.bookmarkEvents.importBegan,
      onImportEnded: chromeMock.bookmarkEvents.importEnded,
    },
    action: { setPopup: chromeMock.setPopup, openPopup: chromeMock.openPopup },
    storage: {
      local: {
        get: chromeMock.get,
        set: chromeMock.set,
        setAccessLevel: chromeMock.setAccessLevel,
      },
      session: {
        get: chromeMock.sessionGet,
        set: chromeMock.sessionSet,
        remove: chromeMock.sessionRemove,
      },
      onChanged: {
        addListener: (listener: (changes: Record<string, unknown>, area: string) => void) =>
          chromeMock.listeners.add(listener),
        removeListener: (listener: (changes: Record<string, unknown>, area: string) => void) =>
          chromeMock.listeners.delete(listener),
      },
    },
    tabs: {
      query: chromeMock.query,
      create: chromeMock.create,
      get: chromeMock.tabGet,
      onUpdated: chromeMock.events.updated,
      onActivated: chromeMock.events.activated,
    },
    contextMenus: {
      removeAll: chromeMock.menuRemoveAll,
      create: chromeMock.menuCreate,
      onClicked: chromeMock.events.menu,
    },
    runtime: {
      id: 'test',
      onInstalled: chromeMock.events.installed,
      onStartup: chromeMock.events.startup,
      onMessage: chromeMock.events.message,
      sendMessage: chromeMock.sendMessage,
      openOptionsPage: chromeMock.openOptionsPage,
      getURL: (path: string) => `chrome-extension://test${path}`,
    },
  },
}));
export function resetChrome() {
  for (const key of Object.keys(chromeMock.state)) delete chromeMock.state[key];
  chromeMock.listeners.clear();
  chromeMock.get.mockClear();
  chromeMock.set.mockClear();
  chromeMock.setAccessLevel.mockClear();
  chromeMock.query.mockReset();
  chromeMock.create.mockReset();
  chromeMock.setPopup.mockReset();
  chromeMock.setPopup.mockResolvedValue(undefined);
  chromeMock.openPopup.mockReset();
  chromeMock.openPopup.mockResolvedValue(undefined);
  chromeMock.sendMessage.mockReset();
  chromeMock.sendMessage.mockImplementation(async (message: unknown) => {
    const { handleBackgroundMessage } = await import('../services/background/messages');
    return handleBackgroundMessage(message);
  });
  const session: Record<string, unknown> = {};
  chromeMock.sessionGet.mockImplementation(async (key: string) =>
    structuredClone({ [key]: session[key] }),
  );
  chromeMock.sessionSet.mockImplementation(async (value: Record<string, unknown>) => {
    Object.assign(session, structuredClone(value));
  });
  chromeMock.sessionRemove.mockImplementation(async (key: string) => {
    delete session[key];
  });
  for (const event of Object.values(chromeMock.events)) event.addListener.mockClear();
  for (const event of Object.values(chromeMock.bookmarkEvents)) {
    event.addListener.mockClear();
    event.removeListener.mockClear();
  }
  chromeMock.permissionAdded.addListener.mockClear();
  chromeMock.permissionRemoved.addListener.mockClear();
  chromeMock.permissionGranted = false;
  chromeMock.permissionRequest.mockReset();
  chromeMock.permissionRequest.mockImplementation(async () => {
    chromeMock.permissionGranted = true;
    return true;
  });
  chromeMock.permissionContains.mockReset();
  chromeMock.permissionContains.mockImplementation(async () => chromeMock.permissionGranted);
  chromeMock.permissionRemove.mockReset();
  chromeMock.permissionRemove.mockImplementation(async () => {
    chromeMock.permissionGranted = false;
    return true;
  });
  chromeMock.bookmarkGetChildren.mockReset();
  chromeMock.bookmarkGetChildren.mockResolvedValue([
    { id: '1', title: 'Bookmarks bar', folderType: 'bookmarks-bar' },
  ]);
  chromeMock.bookmarkGetSubTree.mockReset();
  chromeMock.bookmarkGetSubTree.mockResolvedValue([
    { id: '1', title: 'Bookmarks bar', children: [] },
  ]);
  chromeMock.tabGet.mockReset();
  chromeMock.menuCreate.mockClear();
  chromeMock.menuRemoveAll.mockClear();
  let pending = Promise.resolve();
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: <T>(_name: string, callback: () => Promise<T>) => {
        const operation = pending.then(callback);
        pending = operation.then(
          () => undefined,
          () => undefined,
        );
        return operation;
      },
    },
  });
}
export const input = {
  name: 'Accounts',
  route: '/lightning/o/Account/list',
  category: 'CRM',
  description: 'Customer records',
  favorite: false,
};

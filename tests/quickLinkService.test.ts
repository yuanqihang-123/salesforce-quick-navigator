import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chromeMock, resetChrome, input } from './chromeMock';
import { quickLinkService } from '../services/quickLinkService';
import { storageService } from '../services/storageService';
beforeEach(resetChrome);
describe('quick links and storage', () => {
  it('creates, normalizes, updates, persists favorites and deletes', async () => {
    const link = await quickLinkService.create({
      ...input,
      name: '  Accounts  ',
      description: '  Test  ',
      route: 'https://example.my.salesforce.com/lightning/o/Account/list',
    });
    expect(link.name).toBe('Accounts');
    expect(link.description).toBe('Test');
    expect(link.route).toBe(input.route);
    expect(await quickLinkService.getById(link.id)).toEqual(link);
    await quickLinkService.update(link.id, { category: 'Sales' });
    await quickLinkService.toggleFavorite(link.id);
    expect(await quickLinkService.getById(link.id)).toMatchObject({
      category: 'Sales',
      favorite: true,
    });
    await quickLinkService.delete(link.id);
    expect(await quickLinkService.getAll()).toEqual([]);
  });
  it('searches all fields without case or outer whitespace', async () => {
    await quickLinkService.create(input);
    for (const term of [' ACCOUNTS ', 'account/list', 'crm', 'customer'])
      expect(await quickLinkService.search(term)).toHaveLength(1);
    expect(await quickLinkService.search('unknown')).toHaveLength(0);
  });
  it('serializes concurrent changes and keeps both records', async () => {
    await Promise.all([
      quickLinkService.create(input),
      quickLinkService.create({ ...input, name: 'Other', route: '/lightning/o/Contact/list' }),
    ]);
    const links = await quickLinkService.getAll();
    expect(links).toHaveLength(2);
    await Promise.all(links.map((link) => quickLinkService.toggleFavorite(link.id)));
    expect((await quickLinkService.getAll()).every((link) => link.favorite)).toBe(true);
    await quickLinkService.move(links[1]!.id, -1);
    expect((await quickLinkService.getAll())[0]?.name).toBe('Other');
  });
  it('does not overwrite on invalid writes or read errors', async () => {
    await quickLinkService.create(input);
    await expect(quickLinkService.create({ ...input, name: ' ' })).rejects.toThrow();
    await expect(quickLinkService.update('missing', { name: 'New' })).rejects.toThrow();
    expect(await quickLinkService.getAll()).toHaveLength(1);
    chromeMock.get.mockRejectedValueOnce(new Error('Storage read failed'));
    await expect(quickLinkService.create(input)).rejects.toThrow('Storage read failed');
    chromeMock.set.mockRejectedValueOnce(new Error('Quota exceeded'));
    await expect(
      quickLinkService.create({ ...input, route: '/lightning/o/Contact/list' }),
    ).rejects.toThrow('Quota exceeded');
    expect(await quickLinkService.getAll()).toHaveLength(1);
  });
  it('notifies other views and removes subscriptions', async () => {
    const listener = vi.fn();
    const unsubscribe = storageService.subscribe(listener);
    await quickLinkService.create({ ...input, route: '/lightning/o/Contact/list' });
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    await quickLinkService.create(input);
    expect(listener).toHaveBeenCalledOnce();
  });
  it('rejects incompatible stored schemas without resetting data', async () => {
    chromeMock.state.settings = { schemaVersion: 99, quickLinks: [] };
    await expect(quickLinkService.getAll()).rejects.toThrow('Incompatible');
    expect(chromeMock.set).not.toHaveBeenCalled();
  });
  it('rejects duplicate routes after URL normalization, regardless of name or metadata', async () => {
    const existing = await quickLinkService.create(input);
    await expect(
      quickLinkService.create({
        ...input,
        name: 'Another name',
        favorite: true,
        environmentOverrides: {},
        route: `https://another.sandbox.lightning.force.com${input.route}`,
      }),
    ).rejects.toThrow('already exists');
    expect(await quickLinkService.getAll()).toEqual([existing]);
  });
  it('blocks concurrent duplicate saves inside the storage lock', async () => {
    const results = await Promise.allSettled([
      quickLinkService.create(input),
      quickLinkService.create(input),
    ]);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(await quickLinkService.getAll()).toHaveLength(1);
  });
  it('rejects edits that duplicate another link without changing stored data', async () => {
    const first = await quickLinkService.create(input);
    const second = await quickLinkService.create({ ...input, route: '/lightning/o/Contact/list' });
    await expect(quickLinkService.update(second.id, { route: input.route })).rejects.toThrow(
      'already exists',
    );
    expect(await quickLinkService.getById(second.id)).toEqual(second);
    await quickLinkService.update(first.id, { name: 'Renamed' });
    expect((await quickLinkService.getById(first.id))?.name).toBe('Renamed');
  });
});

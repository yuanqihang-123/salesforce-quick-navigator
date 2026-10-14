import { beforeEach, describe, expect, it } from 'vitest';
import { resetChrome, input } from './chromeMock';
import { quickLinkService } from '../services/quickLinkService';
import { importExportService, parseBackup } from '../services/importExportService';
beforeEach(resetChrome);
describe('backups', () => {
  it('round trips and merges by ID while skipping existing IDs', async () => {
    const first = await quickLinkService.create(input);
    const backup = await importExportService.exportJson();
    await quickLinkService.update(first.id, { name: 'Changed' });
    expect(await importExportService.importJson(backup, 'merge')).toEqual({
      imported: 0,
      skipped: 1,
    });
    expect((await quickLinkService.getAll())[0]?.name).toBe('Changed');
    await quickLinkService.create({ ...input, name: 'Second', route: '/lightning/o/Contact/list' });
    expect(await importExportService.importJson(backup, 'replace')).toEqual({
      imported: 1,
      skipped: 0,
    });
    expect(await quickLinkService.getAll()).toEqual([first]);
  });
  it('reports all invalid entries atomically', async () => {
    const link = await quickLinkService.create(input);
    const json = JSON.stringify({
      schemaVersion: 1,
      quickLinks: [
        { ...link, route: '//evil.com' },
        { ...link, id: 'two', name: '' },
      ],
    });
    await expect(importExportService.importJson(json, 'replace')).rejects.toThrow(
      /Link 1:.*\nLink 2:/,
    );
    expect(await quickLinkService.getAll()).toEqual([link]);
  });
  it('checks JSON, version, types, IDs, dates and lengths', async () => {
    const link = await quickLinkService.create(input);
    expect(() => parseBackup('{oops')).toThrow('Invalid JSON');
    expect(() => parseBackup('{"schemaVersion":99,"quickLinks":[]}')).toThrow('Incompatible');
    for (const changes of [
      { favorite: 'yes' },
      { sortOrder: -1 },
      { createdAt: 'today' },
      { description: 'x'.repeat(501) },
      { id: '' },
      { route: 'https://evil.com/lightning/o/Account/list' },
    ]) {
      expect(() =>
        parseBackup(JSON.stringify({ schemaVersion: 1, quickLinks: [{ ...link, ...changes }] })),
      ).toThrow();
    }
    expect(() =>
      parseBackup(JSON.stringify({ schemaVersion: 1, quickLinks: [link, link] })),
    ).toThrow('Duplicate');
  });
  it('strips arbitrary config fields and renders text safely', async () => {
    const link = await quickLinkService.create({ ...input, name: '<script>alert(1)</script>' });
    const backup = parseBackup(
      JSON.stringify({
        schemaVersion: 1,
        permissions: ['cookies'],
        quickLinks: [{ ...link, injected: 'code' }],
      }),
    );
    expect(backup).toEqual({
      schemaVersion: 2,
      favoritesEnabled: false,
      quickLinks: [link],
      projects: [{ id: 'default', name: 'Default' }],
      environments: [],
    });
  });
  it('skips equivalent links with different IDs when merging and preserves local metadata', async () => {
    const first = await quickLinkService.create(input);
    const backup = JSON.parse(await importExportService.exportJson());
    backup.quickLinks = [
      { ...first, id: 'remote', name: 'Remote name', favorite: true },
      { ...first, id: 'new-one', route: '/lightning/o/Contact/list' },
      { ...first, id: 'new-two', route: '/lightning/o/Contact/list' },
    ];
    expect(await importExportService.importJson(JSON.stringify(backup), 'merge')).toEqual({
      imported: 1,
      skipped: 2,
    });
    expect(await quickLinkService.getById(first.id)).toEqual(first);
    expect(await quickLinkService.getAll()).toHaveLength(2);
  });
  it('keeps the first equivalent link in a replacement backup', async () => {
    const first = await quickLinkService.create(input);
    const backup = JSON.parse(await importExportService.exportJson());
    backup.quickLinks.push({ ...first, id: 'duplicate', name: 'Duplicate' });
    expect(await importExportService.importJson(JSON.stringify(backup), 'replace')).toEqual({
      imported: 1,
      skipped: 1,
    });
    expect(await quickLinkService.getAll()).toEqual([first]);
  });
});

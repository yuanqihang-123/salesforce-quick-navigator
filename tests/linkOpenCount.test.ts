import { beforeEach, expect, it } from 'vitest';
import { resetChrome, input } from './chromeMock';
import { quickLinkService } from '../services/quickLinkService';
import { importExportService, parseBackup } from '../services/importExportService';
import { storageService } from '../services/storageService';

beforeEach(resetChrome);

it('defaults older links to zero and round-trips counts in backups', async () => {
  const link = await quickLinkService.create(input);
  const legacy = { ...link };
  delete legacy.openCount;
  expect(
    parseBackup(JSON.stringify({ schemaVersion: 1, quickLinks: [legacy] })).quickLinks[0]
      ?.openCount,
  ).toBe(0);
  await storageService.mutate((settings) => {
    settings.quickLinks[0]!.openCount = 1234;
  });
  const backup = await importExportService.exportJson();
  await quickLinkService.delete(link.id);
  await importExportService.importJson(backup, 'replace');
  expect((await quickLinkService.getById(link.id))?.openCount).toBe(1234);
});

it.each([-1, 1.5, '3', Number.MAX_SAFE_INTEGER + 1])(
  'rejects invalid open count %s',
  async (openCount) => {
    const link = await quickLinkService.create(input);
    expect(() =>
      parseBackup(JSON.stringify({ schemaVersion: 1, quickLinks: [{ ...link, openCount }] })),
    ).toThrow('Open count');
  },
);

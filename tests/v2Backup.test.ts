import { beforeEach, expect, it } from 'vitest';
import { resetChrome, chromeMock, input } from './chromeMock';
import { storageService } from '../services/storageService';
import { importExportService, parseBackup } from '../services/importExportService';
import { quickLinkService } from '../services/quickLinkService';
import { environmentService } from '../services/environmentService';
import { projectService } from '../services/projectService';
beforeEach(resetChrome);
it('migrates v1 while keeping IDs, metadata, order and favorites', async () => {
  const link = await quickLinkService.create({ ...input, favorite: true });
  const { projectId: _id, ...legacy } = link;
  chromeMock.state.settings = { schemaVersion: 1, quickLinks: [legacy] };
  expect((await storageService.read()).quickLinks).toEqual([link]);
  await quickLinkService.toggleFavorite(link.id);
  expect(chromeMock.state.settings).toMatchObject({ schemaVersion: 2 });
});
it('round trips projects, environments and overrides', async () => {
  const project = await projectService.create('App');
  await environmentService.save({
    id: 'dev',
    name: 'DEV',
    orgDomain: 'app--dev',
    isSandbox: true,
    projectId: project.id,
  });
  await quickLinkService.create({
    ...input,
    projectId: project.id,
    environmentOverrides: { dev: '/lightning/o/Contact/list' },
  });
  const snapshot = await storageService.read();
  const json = await importExportService.exportJson();
  await projectService.delete(project.id);
  await importExportService.importJson(json, 'replace');
  expect(await storageService.read()).toEqual(snapshot);
});
it('rejects dangling override IDs, cross-project references and unsafe routes atomically', async () => {
  const link = await quickLinkService.create(input);
  const settings = await storageService.read();
  for (const environmentOverrides of [{ missing: input.route }, { missing: '//evil.com' }]) {
    const json = JSON.stringify({ ...settings, quickLinks: [{ ...link, environmentOverrides }] });
    await expect(importExportService.importJson(json, 'replace')).rejects.toThrow();
    expect(await storageService.read()).toEqual(settings);
  }
  expect(() =>
    parseBackup(
      JSON.stringify({
        ...settings,
        environments: [
          { id: 'bad', name: 'Bad', orgDomain: 'evil.com', isSandbox: false, projectId: 'default' },
        ],
      }),
    ),
  ).toThrow();
});
it('remaps equivalent environment identities during merge', async () => {
  const env = {
    id: 'local',
    name: 'DEV',
    orgDomain: 'app--dev',
    isSandbox: true,
    projectId: 'default',
  };
  await environmentService.save(env);
  const link = await quickLinkService.create(input);
  const backup = await storageService.read();
  backup.environments = [{ ...env, id: 'remote' }];
  backup.quickLinks = [
    { ...link, id: 'remote-link', environmentOverrides: { remote: '/lightning/o/Contact/list' } },
  ];
  await importExportService.importJson(JSON.stringify(backup), 'merge');
  const result = await storageService.read();
  expect(result.environments).toHaveLength(1);
  expect(result.quickLinks.find((item) => item.id === 'remote-link')?.environmentOverrides).toEqual(
    { local: '/lightning/o/Contact/list' },
  );
});
it('rejects a conflicting environment ID without partially merging', async () => {
  const env = {
    id: 'same',
    name: 'DEV',
    orgDomain: 'local',
    isSandbox: false,
    projectId: 'default',
  };
  await environmentService.save(env);
  const before = await storageService.read();
  const backup = { ...before, environments: [{ ...env, orgDomain: 'remote' }] };
  await expect(importExportService.importJson(JSON.stringify(backup), 'merge')).rejects.toThrow(
    'ID conflict',
  );
  expect(await storageService.read()).toEqual(before);
});
it('deduplicates links after remapping equivalent environments', async () => {
  const env = {
    id: 'local',
    name: 'DEV',
    orgDomain: 'app--dev',
    isSandbox: true,
    projectId: 'default',
  };
  await environmentService.save(env);
  const link = await quickLinkService.create({
    ...input,
    environmentOverrides: { local: '/lightning/o/Contact/list' },
  });
  const backup = await storageService.read();
  backup.environments = [{ ...env, id: 'remote' }];
  backup.quickLinks = [
    {
      ...link,
      id: 'remote-link',
      environmentOverrides: { remote: '/lightning/o/Contact/list' },
    },
  ];
  expect(await importExportService.importJson(JSON.stringify(backup), 'merge')).toEqual({
    imported: 0,
    skipped: 1,
  });
  expect((await storageService.read()).quickLinks).toEqual([link]);
});
it('compares override maps independently of entry order and allows different overrides', async () => {
  for (const id of ['one', 'two']) {
    await environmentService.save({
      id,
      name: id,
      orgDomain: id,
      isSandbox: false,
      projectId: 'default',
    });
  }
  const contact = '/lightning/o/Contact/list';
  const lead = '/lightning/o/Lead/list';
  await quickLinkService.create({ ...input, environmentOverrides: { one: contact, two: lead } });
  await expect(
    quickLinkService.create({
      ...input,
      environmentOverrides: { two: lead, one: contact },
    }),
  ).rejects.toThrow('already exists');
  await quickLinkService.create({ ...input, environmentOverrides: { one: lead, two: contact } });
  await quickLinkService.create(input);
  expect(await quickLinkService.getAll()).toHaveLength(3);
});

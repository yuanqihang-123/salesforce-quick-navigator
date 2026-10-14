import { beforeEach, expect, it } from 'vitest';
import { resetChrome, input } from './chromeMock';
import { environmentService } from '../services/environmentService';
import { projectService } from '../services/projectService';
import { quickLinkService } from '../services/quickLinkService';
import { storageService } from '../services/storageService';
const url = 'https://acme--dev.sandbox.lightning.force.com/lightning/o/Account/list';
beforeEach(resetChrome);
it('records complete org identity, not page data; updates the same Org across domains', async () => {
  await environmentService.remember(url);
  await environmentService.remember('https://acme--dev.sandbox.my.salesforce-setup.com/');
  const settings = await storageService.read();
  expect(settings.environments).toHaveLength(1);
  expect(settings.environments[0]).toMatchObject({
    name: 'DEV',
    orgDomain: 'acme--dev',
    isSandbox: true,
    projectId: 'default',
  });
  expect(settings.environments[0]).not.toHaveProperty('route');
  expect(settings.environments[0]?.lastVisitedAt).toMatch(/Z$/);
  await environmentService.remember('https://evil.com/');
  expect((await storageService.read()).environments).toHaveLength(1);
});
it('keeps concurrent visits and preserves manually assigned project/name', async () => {
  await Promise.all([
    environmentService.remember(url),
    environmentService.remember('https://other.my.salesforce.com/'),
  ]);
  const project = await projectService.create('Work');
  const env = (await storageService.read()).environments[0]!;
  await environmentService.save({ ...env, projectId: project.id, name: 'Development' });
  await environmentService.remember(url);
  expect((await storageService.read()).environments).toHaveLength(2);
  expect(
    (await storageService.read()).environments.find((item) => item.id === env.id),
  ).toMatchObject({ name: 'Development', projectId: project.id });
});
it('cleans overrides when an environment moves or is deleted', async () => {
  await environmentService.remember(url);
  const env = (await storageService.read()).environments[0]!;
  const link = await quickLinkService.create({
    ...input,
    environmentOverrides: { [env.id]: '/lightning/o/Contact/list' },
  });
  const project = await projectService.create('Other');
  await environmentService.save({ ...env, projectId: project.id });
  expect((await quickLinkService.getById(link.id))?.environmentOverrides).toEqual({});
  const second = await quickLinkService.create({
    ...input,
    projectId: project.id,
    environmentOverrides: { [env.id]: input.route },
  });
  await environmentService.delete(env.id);
  expect((await quickLinkService.getById(second.id))?.environmentOverrides).toEqual({});
});
it('rejects unsupported manual orgs and unknown projects without writing', async () => {
  const env = {
    id: 'one',
    name: 'Fake',
    orgDomain: 'evil.com',
    isSandbox: false,
    projectId: 'default',
  };
  await expect(environmentService.save(env)).rejects.toThrow();
  await expect(
    environmentService.save({ ...env, orgDomain: 'valid', projectId: 'missing' }),
  ).rejects.toThrow('unknown project');
  expect((await storageService.read()).environments).toEqual([]);
});

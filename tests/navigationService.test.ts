import { beforeEach, expect, it } from 'vitest';
import { resetChrome, chromeMock, input } from './chromeMock';
import { environmentService } from '../services/environmentService';
import { navigationService } from '../services/navigationService';
import { quickLinkService } from '../services/quickLinkService';
import { projectService } from '../services/projectService';
const env = {
  id: 'uat',
  name: 'UAT',
  orgDomain: 'acme--uat',
  isSandbox: true,
  projectId: 'default',
};
beforeEach(resetChrome);
it('uses target-specific overrides and keeps default route unchanged', async () => {
  await environmentService.save(env);
  const route = '/lightning/setup/CustomMetadata/page?address=%2Fone%3Fx%3Dy#here';
  const link = await quickLinkService.create({ ...input, environmentOverrides: { uat: route } });
  await navigationService.openLink(link, 'default', 'uat');
  expect(chromeMock.create).toHaveBeenCalledWith({
    url: 'https://acme--uat.sandbox.my.salesforce-setup.com' + route,
  });
  expect((await quickLinkService.getById(link.id))?.route).toBe(input.route);
  expect(chromeMock.query).not.toHaveBeenCalled();
});
it('applies an override to Current Org and reads active tab each time', async () => {
  await environmentService.save(env);
  const link = await quickLinkService.create({
    ...input,
    environmentOverrides: { uat: '/lightning/o/Contact/list' },
  });
  chromeMock.query
    .mockResolvedValueOnce([{ url: 'https://acme--uat.sandbox.my.salesforce.com/' }])
    .mockResolvedValueOnce([{ url: 'https://another.lightning.force.com/' }]);
  await navigationService.openLink(link, 'default', '');
  await navigationService.openLink(link, 'default', '');
  expect(chromeMock.create.mock.calls).toEqual([
    [{ url: 'https://acme--uat.sandbox.lightning.force.com/lightning/o/Contact/list' }],
    [{ url: 'https://another.lightning.force.com/lightning/o/Account/list' }],
  ]);
});
it('opens current route in another Org, preserving query/hash', async () => {
  await environmentService.save(env);
  chromeMock.query.mockResolvedValue([
    { url: 'https://other.my.salesforce-setup.com/lightning/o/Account/list?filterName=Recent#x' },
  ]);
  await navigationService.openCurrentPage('default', 'uat');
  expect(chromeMock.create).toHaveBeenCalledWith({
    url: 'https://acme--uat.sandbox.lightning.force.com/lightning/o/Account/list?filterName=Recent#x',
  });
});
it('opens the current page in the detected Org when it is not saved in this project', async () => {
  const route = '/lightning/setup/ApexClasses/home?address=%2Fone#classes';
  chromeMock.query.mockResolvedValue([{ url: 'https://other.lightning.force.com' + route }]);
  await navigationService.openCurrentPage('default', '');
  expect(chromeMock.create).toHaveBeenCalledWith({
    url: 'https://other.my.salesforce-setup.com' + route,
  });
});
it('rejects unsupported current pages even with a detected-Org target', async () => {
  for (const url of [
    'https://example.com/lightning/o/Account/list',
    'https://one.lightning.force.com/lightning/page/home',
  ]) {
    chromeMock.query.mockResolvedValue([{ url }]);
    await expect(navigationService.openCurrentPage('default', '')).rejects.toThrow();
  }
  expect(chromeMock.create).not.toHaveBeenCalled();
});
it('rejects stale and cross-project targets and invalid current pages', async () => {
  await environmentService.save(env);
  const project = await projectService.create('Other');
  const link = await quickLinkService.create(input);
  await expect(navigationService.openLink(link, project.id, 'uat')).rejects.toThrow(
    'Link no longer',
  );
  await expect(navigationService.openCurrentPage(project.id, 'uat')).rejects.toThrow();
  await environmentService.delete('uat');
  await expect(navigationService.openLink(link, 'default', 'uat')).rejects.toThrow(
    'Target environment',
  );
  chromeMock.query.mockResolvedValue([{ url: 'https://example.com/' }]);
  await expect(navigationService.openLink(link, 'default', '')).rejects.toThrow();
  expect(chromeMock.create).not.toHaveBeenCalled();
});

it('counts successful opens across current and saved Orgs without losing concurrent increments', async () => {
  await environmentService.save(env);
  const link = await quickLinkService.create(input);
  expect(link.openCount).toBe(0);
  chromeMock.query.mockResolvedValue([{ url: 'https://another.lightning.force.com/' }]);
  await Promise.all([
    navigationService.openLink(link, 'default', ''),
    navigationService.openLink(link, 'default', 'uat'),
    navigationService.openLink(link, 'default', 'uat'),
  ]);
  expect((await quickLinkService.getById(link.id))?.openCount).toBe(3);
  await quickLinkService.update(link.id, { name: 'Renamed' });
  await quickLinkService.toggleFavorite(link.id);
  expect((await quickLinkService.getById(link.id))?.openCount).toBe(3);
});

it('does not count rejected targets, failed tab opens or open-current-page actions', async () => {
  await environmentService.save(env);
  const link = await quickLinkService.create(input);
  await expect(navigationService.openLink(link, 'default', 'missing')).rejects.toThrow();
  chromeMock.create.mockRejectedValueOnce(new Error('Tab failed'));
  await expect(navigationService.openLink(link, 'default', 'uat')).rejects.toThrow('Tab failed');
  chromeMock.query.mockResolvedValue([
    { url: 'https://another.lightning.force.com/lightning/o/Account/list' },
  ]);
  await navigationService.openCurrentPage('default', 'uat');
  expect((await quickLinkService.getById(link.id))?.openCount).toBe(0);
});

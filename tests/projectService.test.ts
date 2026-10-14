import { beforeEach, expect, it } from 'vitest';
import { resetChrome, input } from './chromeMock';
import { projectService } from '../services/projectService';
import { environmentService } from '../services/environmentService';
import { quickLinkService } from '../services/quickLinkService';
import { storageService } from '../services/storageService';
beforeEach(resetChrome);
it('creates/renames projects and only removes the selected project data', async () => {
  const project = await projectService.create('  App A  ');
  await projectService.rename(project.id, 'App B');
  await quickLinkService.create(input);
  await quickLinkService.create({ ...input, projectId: project.id });
  await environmentService.save({
    id: 'env',
    name: 'DEV',
    orgDomain: 'app--dev',
    isSandbox: true,
    projectId: project.id,
  });
  await projectService.delete(project.id);
  const settings = await storageService.read();
  expect(settings.projects).toEqual([{ id: 'default', name: 'Default' }]);
  expect(settings.quickLinks).toHaveLength(1);
  expect(settings.environments).toEqual([]);
  await expect(projectService.delete('default')).rejects.toThrow('cannot be deleted');
});
it('reorders links only inside their project', async () => {
  const project = await projectService.create('App');
  const first = await quickLinkService.create(input);
  const other = await quickLinkService.create({ ...input, projectId: project.id });
  const last = await quickLinkService.create({
    ...input,
    name: 'Last',
    route: '/lightning/o/Contact/list',
  });
  await quickLinkService.move(last.id, -1);
  const links = await quickLinkService.getAll();
  expect(links.filter((link) => link.projectId === 'default').map((link) => link.id)).toEqual([
    last.id,
    first.id,
  ]);
  expect(links.find((link) => link.id === other.id)?.projectId).toBe(project.id);
});
it('allows the same route in different projects but rejects moving it into a duplicate', async () => {
  const project = await projectService.create('App');
  await quickLinkService.create(input);
  const other = await quickLinkService.create({ ...input, projectId: project.id });
  await expect(quickLinkService.update(other.id, { projectId: 'default' })).rejects.toThrow(
    'already exists',
  );
  expect(await quickLinkService.getById(other.id)).toEqual(other);
});

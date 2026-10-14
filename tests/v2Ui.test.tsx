import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetChrome, chromeMock, input } from './chromeMock';
import { App } from '../components/App';
import { environmentService } from '../services/environmentService';
import { quickLinkService } from '../services/quickLinkService';
import { projectService } from '../services/projectService';
import { storageService } from '../services/storageService';
import { draftService } from '../services/draftService';
const env = {
  id: 'uat',
  name: 'UAT',
  orgDomain: 'app--uat',
  isSandbox: true,
  projectId: 'default',
};
beforeEach(resetChrome);
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});
it('chooses a saved Org in the dialog on a non-Salesforce page and uses its override', async () => {
  await environmentService.save(env);
  await quickLinkService.create({
    ...input,
    environmentOverrides: { uat: '/lightning/o/Contact/list' },
  });
  chromeMock.query.mockResolvedValue([{ url: 'https://example.com/' }]);
  render(<App mode="popup" />);
  await waitFor(() =>
    expect((screen.getByRole('button', { name: 'Accounts' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  expect(screen.queryByRole('combobox', { name: 'Target Org' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Accounts' }));
  expect(screen.getByRole('dialog').textContent).toContain('UAT');
  await userEvent.keyboard('{Enter}');
  await waitFor(() =>
    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'https://app--uat.sandbox.lightning.force.com/lightning/o/Contact/list',
    }),
  );
});
it('filters links and available Orgs on project change', async () => {
  const project = await projectService.create('Other App');
  await quickLinkService.create(input);
  await quickLinkService.create({ ...input, name: 'Other link', projectId: project.id });
  await environmentService.save(env);
  chromeMock.query.mockResolvedValue([{ url: 'https://example.com/' }]);
  render(<App mode="popup" />);
  await screen.findByRole('button', { name: 'Accounts' });
  await userEvent.selectOptions(screen.getByLabelText('Project'), project.id);
  expect(screen.queryByRole('button', { name: 'Accounts' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Other link' })).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Other link' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
});
it('edits and persists an environment route in the link form', async () => {
  await environmentService.save(env);
  const link = await quickLinkService.create(input);
  render(<App mode="options" />);
  await screen.findByText('Accounts');
  await userEvent.click(screen.getByRole('button', { name: 'Edit Accounts' }));
  await userEvent.click(screen.getByText('Environment routes (0)'));
  await userEvent.type(screen.getByLabelText('UAT route'), '/lightning/setup/ApexClasses/home');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(async () =>
    expect((await quickLinkService.getById(link.id))?.environmentOverrides).toEqual({
      uat: '/lightning/setup/ApexClasses/home',
    }),
  );
});
it.each(['popup', 'options'] as const)(
  'opens a right-click draft in %s for confirmation and saves only after Save',
  async (mode) => {
    const id = await draftService.create(
      'https://app.lightning.force.com/lightning/o/Account/list',
      'Right-click page',
    );
    window.history.replaceState(null, '', `/?draft=${id}`);
    chromeMock.query.mockResolvedValue([
      { url: 'https://app.lightning.force.com/lightning/o/Account/list' },
    ]);
    render(<App mode={mode} />);
    expect(((await screen.findByLabelText('Name *')) as HTMLInputElement).value).toBe(
      'Right-click page',
    );
    expect((await storageService.read()).quickLinks).toEqual([]);
    expect((screen.getByLabelText('URL / Route *') as HTMLTextAreaElement).value).toBe(
      '/lightning/o/Account/list',
    );
    expect(window.location.search).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await storageService.read()).quickLinks).toHaveLength(1));
  },
);
it('cancels a right-click popup draft without saving or reopening it', async () => {
  const id = await draftService.create(
    'https://app.lightning.force.com/lightning/o/Account/list',
    'Cancelled page',
  );
  window.history.replaceState(null, '', `/?draft=${id}`);
  chromeMock.query.mockResolvedValue([
    { url: 'https://app.lightning.force.com/lightning/o/Account/list' },
  ]);
  const view = render(<App mode="popup" />);
  await screen.findByLabelText('Name *');
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect((await storageService.read()).quickLinks).toEqual([]);
  await expect(draftService.consume(id)).rejects.toThrow();
  view.unmount();
  render(<App mode="popup" />);
  await screen.findByText('Your shortcuts start here');
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('requires confirmation before deleting an entire project', async () => {
  const project = await projectService.create('Delete me');
  await quickLinkService.create({ ...input, projectId: project.id });
  render(<App mode="options" />);
  await screen.findByRole('button', { name: 'Delete project Delete me' });
  await userEvent.click(screen.getByRole('button', { name: 'Delete project Delete me' }));
  expect((await storageService.read()).projects).toHaveLength(2);
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect((await storageService.read()).projects).toHaveLength(2);
});

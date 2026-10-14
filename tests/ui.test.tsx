import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { chromeMock, resetChrome, input } from './chromeMock';
import { quickLinkService } from '../services/quickLinkService';
import { App } from '../components/App';
import { QuickLinkForm } from '../components/QuickLinkForm';
beforeEach(resetChrome);
afterEach(cleanup);
it('shows duplicate guidance and keeps the form open when a duplicate save is rejected', async () => {
  const existing = await quickLinkService.create(input);
  const onCancel = vi.fn();
  render(
    <QuickLinkForm
      initial={{ ...input, name: 'Another name' }}
      links={[existing]}
      onSave={async (data) => {
        await quickLinkService.create(data);
      }}
      onCancel={onCancel}
    />,
  );
  expect(screen.getByRole('status').textContent).toContain('already saved in this project');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect((await screen.findByRole('alert')).textContent).toContain('already exists');
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(await quickLinkService.getAll()).toEqual([existing]);
  expect(onCancel).not.toHaveBeenCalled();
});
it('allows management on non-Salesforce pages and disables navigation', async () => {
  await quickLinkService.create(input);
  chromeMock.query.mockResolvedValue([{ url: 'https://example.com/' }]);
  render(<App mode="popup" />);
  await screen.findByRole('button', { name: 'Accounts' });
  expect((screen.getByRole('button', { name: 'Accounts' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  expect(screen.queryByRole('button', { name: 'Save Current Page' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Edit Accounts' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
});
it('keeps form values on storage failure and permits retry', async () => {
  const user = userEvent.setup();
  render(
    <QuickLinkForm
      initial={input}
      links={[]}
      onCancel={() => {}}
      onSave={(data) => quickLinkService.create(data).then(() => undefined)}
    />,
  );
  chromeMock.set.mockRejectedValueOnce(new Error('Storage write failed'));
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Storage write failed');
  expect((screen.getByLabelText('Name *') as HTMLInputElement).value).toBe('Accounts');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(async () => expect(await quickLinkService.getAll()).toHaveLength(1));
});
it('syncs settings with external updates and requires delete confirmation', async () => {
  render(<App mode="options" />);
  await screen.findByText('Your shortcuts start here');
  await quickLinkService.create(input);
  await screen.findByText('Accounts');
  await userEvent.click(screen.getByRole('button', { name: 'Delete Accounts' }));
  expect(await quickLinkService.getAll()).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(await quickLinkService.getAll()).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'Delete Accounts' }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: /^Delete$/ }),
  );
  await waitFor(async () => expect(await quickLinkService.getAll()).toHaveLength(0));
});
it('prefills current page without saving until confirmation', async () => {
  chromeMock.query.mockResolvedValue([
    {
      url: 'https://one.sandbox.lightning.force.com/lightning/o/Account/list',
      title: 'My Accounts',
    },
  ]);
  render(<App mode="popup" />);
  await waitFor(() =>
    expect((screen.getByRole('button', { name: '+ Add Link' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  expect(screen.getAllByRole('button', { name: 'Settings' })).toHaveLength(1);
  expect(screen.queryByText('one.sandbox.lightning.force.com')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: '+ Add Link' }));
  expect(((await screen.findByLabelText('Name *')) as HTMLInputElement).value).toBe('My Accounts');
  expect(await quickLinkService.getAll()).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(async () => expect(await quickLinkService.getAll()).toHaveLength(1));
});
it('opens a blank form for unsupported Salesforce routes', async () => {
  chromeMock.query.mockResolvedValue([
    { url: 'https://one.lightning.force.com/builder_platform_interaction/flowBuilder.app' },
  ]);
  render(<App mode="popup" />);
  await waitFor(() =>
    expect((screen.getByRole('button', { name: '+ Add Link' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  await userEvent.click(screen.getByRole('button', { name: '+ Add Link' }));
  expect(((await screen.findByLabelText('URL / Route *')) as HTMLTextAreaElement).value).toBe('');
  expect((screen.getByLabelText('Name *') as HTMLInputElement).value).toBe('');
});
it('validates replacement backups and waits for explicit confirmation', async () => {
  const existing = await quickLinkService.create(input);
  const backup = JSON.stringify({
    schemaVersion: 1,
    quickLinks: [{ ...existing, id: 'replacement', name: 'Imported' }],
  });
  render(<App mode="options" />);
  await screen.findByText('Accounts');
  await userEvent.selectOptions(screen.getByLabelText('Import mode'), 'replace');
  const file = new File([backup], 'backup.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => backup });
  await userEvent.upload(screen.getByLabelText('Import JSON'), file);
  await screen.findByText('Replace all Quick Links?');
  expect(await quickLinkService.getAll()).toEqual([existing]);
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(await quickLinkService.getAll()).toEqual([existing]);
  await userEvent.upload(screen.getByLabelText('Import JSON'), file);
  await screen.findByText('Replace all Quick Links?');
  await userEvent.click(screen.getByRole('button', { name: 'Replace' }));
  await screen.findByText('Imported');
  expect((await quickLinkService.getAll())[0]?.id).toBe('replacement');
});
it('opens a blank add form on non-Salesforce pages', async () => {
  chromeMock.query.mockResolvedValue([{ url: 'https://example.com/' }]);
  render(<App mode="popup" />);
  await waitFor(() =>
    expect((screen.getByRole('button', { name: '+ Add Link' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  await userEvent.click(screen.getByRole('button', { name: '+ Add Link' }));
  expect(((await screen.findByLabelText('URL / Route *')) as HTMLTextAreaElement).value).toBe('');
});
it('allows changing the prefilled page to another link', async () => {
  chromeMock.query.mockResolvedValue([
    { url: 'https://one.lightning.force.com/lightning/o/Account/list', title: 'Accounts' },
  ]);
  render(<App mode="popup" />);
  await waitFor(() =>
    expect((screen.getByRole('button', { name: '+ Add Link' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  await userEvent.click(screen.getByRole('button', { name: '+ Add Link' }));
  const name = await screen.findByLabelText('Name *');
  const route = screen.getByLabelText('URL / Route *');
  await userEvent.clear(name);
  await userEvent.type(name, 'Apex Classes');
  await userEvent.clear(route);
  await userEvent.type(route, '/lightning/setup/ApexClasses/home');
  await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
  await waitFor(async () => expect(await quickLinkService.getAll()).toHaveLength(1));
  expect((await quickLinkService.getAll())[0]).toMatchObject({
    name: 'Apex Classes',
    route: '/lightning/setup/ApexClasses/home',
  });
});
it.each(['Meta', 'Control'])('saves with %s+Enter from a textarea', async (modifier) => {
  const save = vi.fn(async () => {});
  render(<QuickLinkForm initial={input} links={[]} onSave={save} onCancel={() => {}} />);
  await userEvent.click(screen.getByLabelText('Description'));
  await userEvent.keyboard(`{${modifier}>}{Enter}{/${modifier}}`);
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save).toHaveBeenCalledWith(input);
});
it('keyboard save obeys validation and Escape cancels without writing', async () => {
  const save = vi.fn(async () => {});
  const cancel = vi.fn();
  render(
    <QuickLinkForm initial={{ ...input, name: '' }} links={[]} onSave={save} onCancel={cancel} />,
  );
  await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
  expect(save).not.toHaveBeenCalled();
  await userEvent.keyboard('{Escape}');
  expect(cancel).toHaveBeenCalledOnce();
  expect(save).not.toHaveBeenCalled();
});

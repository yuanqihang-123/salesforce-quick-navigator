import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetChrome, chromeMock, input } from './chromeMock';
import { App } from '../components/App';
import { quickLinkService } from '../services/quickLinkService';
import { storageService } from '../services/storageService';
import { importExportService, parseBackup } from '../services/importExportService';

beforeEach(resetChrome);
afterEach(cleanup);

it('defaults favorites off, preserves counts and immediately syncs the setting to the popup', async () => {
  const link = await quickLinkService.create({ ...input, favorite: true });
  await storageService.mutate((settings) => {
    settings.quickLinks[0]!.openCount = 12;
  });
  chromeMock.query.mockResolvedValue([{ url: 'https://one.lightning.force.com/' }]);
  render(<App mode="popup" />);
  await screen.findByRole('button', { name: 'Accounts' });
  expect(screen.queryByRole('button', { name: 'Unfavorite Accounts' })).toBeNull();
  expect(screen.getByLabelText('Opened 12 times').textContent).toBe('12');
  render(<App mode="options" />);
  const toggle = await screen.findByRole('checkbox', { name: 'Enable favorites' });
  expect((toggle as HTMLInputElement).checked).toBe(false);
  await userEvent.click(toggle);
  await waitFor(() =>
    expect(screen.getAllByRole('button', { name: 'Unfavorite Accounts' })).toHaveLength(2),
  );
  expect((await storageService.read()).favoritesEnabled).toBe(true);
  await waitFor(() => expect((toggle as HTMLInputElement).disabled).toBe(false));
  await userEvent.click(toggle);
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Unfavorite Accounts' })).toBeNull(),
  );
  expect((await quickLinkService.getById(link.id))?.favorite).toBe(true);
  expect((await quickLinkService.getById(link.id))?.openCount).toBe(12);
});

it('hides the favorites field in link forms while disabled', async () => {
  await quickLinkService.create({ ...input, favorite: true });
  render(<App mode="options" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Edit Accounts' }));
  expect(screen.queryByRole('checkbox', { name: 'Add to Favorites' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect((await quickLinkService.getAll())[0]?.favorite).toBe(true);
});

it('round-trips the preference and rejects invalid values', async () => {
  await storageService.mutate((settings) => {
    settings.favoritesEnabled = true;
  });
  const backup = await importExportService.exportJson();
  await storageService.mutate((settings) => {
    settings.favoritesEnabled = false;
  });
  await importExportService.importJson(backup, 'merge');
  expect((await storageService.read()).favoritesEnabled).toBe(false);
  await importExportService.importJson(backup, 'replace');
  expect((await storageService.read()).favoritesEnabled).toBe(true);
  expect(() =>
    parseBackup(JSON.stringify({ schemaVersion: 1, quickLinks: [], favoritesEnabled: 'yes' })),
  ).toThrow('Favorites enabled');
});

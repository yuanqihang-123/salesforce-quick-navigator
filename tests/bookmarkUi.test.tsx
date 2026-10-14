import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { chromeMock, resetChrome } from './chromeMock';
import { App } from '../components/App';
import { bookmarkSyncService } from '../services/bookmarkSyncService';
import { storageService } from '../services/storageService';

beforeEach(() => {
  resetChrome();
  chromeMock.query.mockResolvedValue([{ url: 'https://example.com/' }]);
  chromeMock.bookmarkGetSubTree.mockResolvedValue([
    {
      id: '1',
      title: 'Bookmarks bar',
      children: [
        {
          id: '10',
          title: 'Bookmarked accounts',
          url: 'https://company.lightning.force.com/lightning/o/Account/list',
        },
        { id: '11', title: 'Classic home', url: 'https://company.my.salesforce.com/' },
      ],
    },
  ]);
});
afterEach(cleanup);

it('shows a light prompt, remembers dismissal, and never asks for permissions on its own', async () => {
  const popup = render(<App mode="popup" />);
  await screen.findByRole('button', { name: 'Enable bookmark links' });
  expect(chromeMock.permissionRequest).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Enable bookmark links' })).toBeNull(),
  );
  popup.unmount();
  render(<App mode="popup" />);
  await screen.findByText('Your shortcuts start here');
  expect((await bookmarkSyncService.read()).dismissed).toBe(true);
  expect(chromeMock.permissionRequest).not.toHaveBeenCalled();
});

it('enables from the popup and immediately opens imported Quick Links through the existing Org chooser', async () => {
  render(<App mode="popup" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Enable bookmark links' }));
  const link = await screen.findByRole('button', { name: 'Bookmarked accounts' });
  expect(chromeMock.permissionRequest).toHaveBeenCalledOnce();
  expect((await bookmarkSyncService.read()).enabled).toBe(true);
  await userEvent.click(link);
  await userEvent.click(await screen.findByRole('button', { name: 'Open link ↗' }));
  await waitFor(() =>
    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'https://company.lightning.force.com/lightning/o/Account/list',
    }),
  );
});

it('handles denied permission without importing and offers enabling again in Settings', async () => {
  chromeMock.permissionRequest.mockResolvedValueOnce(false);
  const popup = render(<App mode="popup" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Enable bookmark links' }));
  await screen.findByText(/Bookmark access was not granted/);
  expect((await storageService.read()).quickLinks).toEqual([]);
  expect((await bookmarkSyncService.read()).enabled).toBe(false);
  expect(chromeMock.bookmarkGetChildren).not.toHaveBeenCalled();
  popup.unmount();
  render(<App mode="options" />);
  await userEvent.click(await screen.findByRole('checkbox', { name: 'Enable bookmark sync' }));
  await screen.findByRole('button', { name: 'Edit Bookmarked accounts' });
  expect((await bookmarkSyncService.read()).enabled).toBe(true);
});

it('disables and refreshes from Settings, retains imports, and can edit imported homepage links', async () => {
  render(<App mode="options" />);
  const toggle = await screen.findByRole('checkbox', { name: 'Enable bookmark sync' });
  await userEvent.click(toggle);
  await screen.findByRole('button', { name: 'Edit Classic home' });
  await userEvent.click(screen.getByRole('button', { name: 'Refresh now' }));
  await waitFor(() => expect((toggle as HTMLInputElement).disabled).toBe(false));
  await userEvent.click(screen.getByRole('button', { name: 'Edit Classic home' }));
  const name = screen.getByRole('textbox', { name: 'Name *' });
  await userEvent.clear(name);
  await userEvent.type(name, 'My homepage');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByRole('button', { name: 'Edit My homepage' });
  await userEvent.click(toggle);
  await waitFor(() => expect((toggle as HTMLInputElement).checked).toBe(false));
  expect((await storageService.read()).quickLinks).toHaveLength(2);
  expect(chromeMock.permissionRemove).toHaveBeenCalledOnce();
});

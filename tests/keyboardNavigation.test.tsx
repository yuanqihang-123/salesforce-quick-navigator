import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetChrome, chromeMock, input } from './chromeMock';
import { App } from '../components/App';
import { quickLinkService } from '../services/quickLinkService';
import { environmentService } from '../services/environmentService';

beforeEach(async () => {
  resetChrome();
  const { storageService } = await import('../services/storageService');
  await storageService.mutate((settings) => {
    settings.favoritesEnabled = true;
  });
});
afterEach(cleanup);
async function openPopup(url = 'https://one.lightning.force.com/lightning/o/Account/list') {
  // Deliberately create in the opposite order to displayed category/favorite order.
  await quickLinkService.create({
    ...input,
    name: 'Doc Zeta',
    category: 'Z',
    route: '/lightning/o/Zeta/list',
  });
  await quickLinkService.create({
    ...input,
    name: 'Doc Alpha',
    category: 'A',
    route: '/lightning/o/Alpha/list',
  });
  await quickLinkService.create({
    ...input,
    name: 'Doc Favorite',
    favorite: true,
    route: '/lightning/o/Favorite/list',
  });
  chromeMock.query.mockResolvedValue([{ url }]);
  render(<App mode="popup" />);
  await screen.findByRole('button', { name: 'Doc Favorite' });
  return screen.getByRole('searchbox', { name: 'Search links' });
}
function expectSelected(search: HTMLElement, name: string) {
  const button = screen.getByRole('button', { name });
  expect(search.getAttribute('aria-activedescendant')).toBe(button.id);
  expect(button.closest('li')?.getAttribute('data-active')).toBe('true');
  expect(document.activeElement).toBe(search);
}

it('selects links then confirms the current Org with a second Enter and restores search focus', async () => {
  const search = await openPopup();
  await userEvent.keyboard('doc');
  expectSelected(search, 'Doc Favorite');
  await userEvent.keyboard('{ArrowDown}');
  expectSelected(search, 'Doc Alpha');
  await userEvent.keyboard('{ArrowDown}');
  expectSelected(search, 'Doc Zeta');
  await userEvent.keyboard('{ArrowUp}');
  expectSelected(search, 'Doc Alpha');
  await userEvent.keyboard('{Enter}');
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(chromeMock.create).not.toHaveBeenCalled();
  await userEvent.keyboard('{Enter}');
  await waitFor(() =>
    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'https://one.lightning.force.com/lightning/o/Alpha/list',
    }),
  );
  expect(document.activeElement).toBe(search);
});

it('includes the current-page button at both ends and resets selection when filtering', async () => {
  await environmentService.save({
    id: 'uat',
    name: 'UAT',
    orgDomain: 'app--uat',
    isSandbox: true,
    projectId: 'default',
  });
  const search = await openPopup();
  const currentPage = screen.getByRole('button', { name: 'Open current page ↗' });
  await userEvent.keyboard('doc{ArrowUp}');
  expect(document.activeElement).toBe(currentPage);
  expect(search.getAttribute('aria-activedescendant')).toBeNull();
  await userEvent.keyboard('{ArrowUp}');
  expectSelected(search, 'Doc Zeta');
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(currentPage);
  await userEvent.keyboard('{ArrowDown}');
  expectSelected(search, 'Doc Favorite');
  await userEvent.clear(search);
  await userEvent.keyboard('alpha');
  expectSelected(search, 'Doc Alpha');
  await userEvent.clear(search);
  await userEvent.keyboard('no match{Enter}');
  expect(search.getAttribute('aria-activedescendant')).toBeNull();
  expect(chromeMock.create).not.toHaveBeenCalled();
  await userEvent.clear(search);
  expect(search.getAttribute('aria-activedescendant')).toBeNull();
  await userEvent.keyboard('{ArrowDown}');
  expectSelected(search, 'Doc Favorite');
});

it('keeps link-only arrow wrapping when the current page cannot be opened', async () => {
  await environmentService.save({
    id: 'uat',
    name: 'UAT',
    orgDomain: 'app--uat',
    isSandbox: true,
    projectId: 'default',
  });
  const search = await openPopup('https://example.com/');
  expect(
    (screen.getByRole('button', { name: 'Open current page ↗' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  await userEvent.keyboard('doc{ArrowUp}');
  expectSelected(search, 'Doc Zeta');
  await userEvent.keyboard('{ArrowDown}');
  expectSelected(search, 'Doc Favorite');
});

it('allows searching first and choosing a saved Org on a non-Salesforce page', async () => {
  await environmentService.save({
    id: 'uat',
    name: 'UAT',
    orgDomain: 'app--uat',
    isSandbox: true,
    projectId: 'default',
  });
  const search = await openPopup('https://example.com/');
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Doc Favorite' }) as HTMLButtonElement).disabled,
    ).toBe(false),
  );
  await userEvent.keyboard('doc');
  expectSelected(search, 'Doc Favorite');
  await userEvent.keyboard('{Enter}');
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(chromeMock.create).not.toHaveBeenCalled();
  await userEvent.keyboard('{Enter}');
  await waitFor(() =>
    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'https://app--uat.sandbox.lightning.force.com/lightning/o/Favorite/list',
    }),
  );
});

it('switches Orgs with arrow keys and mouse, cancels, and ignores held or composing Enter in the dialog', async () => {
  await environmentService.save({
    id: 'uat',
    name: 'UAT',
    orgDomain: 'app--uat',
    isSandbox: true,
    projectId: 'default',
  });
  const search = await openPopup();
  await userEvent.keyboard('doc{Enter}');
  const dialog = screen.getByRole('dialog');
  expect(dialog.textContent).toContain('ONE');
  fireEvent.keyDown(dialog, { key: 'Enter', repeat: true });
  fireEvent.keyDown(dialog, { key: 'Enter', isComposing: true });
  expect(chromeMock.create).not.toHaveBeenCalled();
  await userEvent.keyboard('{ArrowRight}');
  expect(dialog.textContent).toContain('UAT');
  await userEvent.keyboard('{ArrowLeft}');
  expect(dialog.textContent).toContain('ONE');
  await userEvent.click(screen.getByRole('button', { name: 'Next Org' }));
  expect(dialog.textContent).toContain('UAT');
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(search);
  expect(chromeMock.create).not.toHaveBeenCalled();
  await userEvent.keyboard('{Enter}{ArrowRight}{Enter}');
  await waitFor(() =>
    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'https://app--uat.sandbox.lightning.force.com/lightning/o/Favorite/list',
    }),
  );
});

it('does not navigate on IME confirmation or held Enter', async () => {
  const search = await openPopup();
  await userEvent.keyboard('doc');
  fireEvent.keyDown(search, { key: 'Enter', isComposing: true });
  fireEvent.keyDown(search, { key: 'Enter', repeat: true });
  expect(chromeMock.create).not.toHaveBeenCalled();
  expectSelected(search, 'Doc Favorite');
});

it('removes the homepage Org selector and defaults the dialog to the detected saved Org', async () => {
  await environmentService.save({
    id: 'named',
    name: 'Development',
    orgDomain: 'one',
    isSandbox: false,
    projectId: 'default',
  });
  await openPopup();
  expect(screen.queryByRole('combobox', { name: 'Target Org' })).toBeNull();
  await userEvent.keyboard('doc{Enter}');
  expect(screen.getByRole('dialog').textContent).toContain('Development');
});

it('keeps the chosen Org after an opening error and permits retry', async () => {
  await openPopup();
  chromeMock.create.mockRejectedValueOnce(new Error('Unable to open tab'));
  await userEvent.keyboard('doc{Enter}{Enter}');
  expect((await screen.findByRole('alert')).textContent).toBe('Unable to open tab');
  expect(screen.getByRole('dialog').textContent).toContain('ONE');
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(chromeMock.create).toHaveBeenCalledTimes(2);
});

it('ranks all results by opens, displays counts beside stars and uses the same keyboard order', async () => {
  const search = await openPopup();
  const links = await quickLinkService.getAll();
  const zeta = links.find((link) => link.name === 'Doc Zeta')!;
  const alpha = links.find((link) => link.name === 'Doc Alpha')!;
  const { navigationService } = await import('../services/navigationService');
  await navigationService.openLink(zeta, 'default', '');
  await navigationService.openLink(zeta, 'default', '');
  await navigationService.openLink(alpha, 'default', '');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Favorite Doc Zeta' }).textContent).toBe('☆2'),
  );
  const names = [...document.querySelectorAll('.link-name')].map((node) => node.textContent);
  expect(names).toEqual(['Doc Zeta', 'Doc Alpha', 'Doc Favorite']);
  expect(screen.getByRole('button', { name: 'Favorite Doc Zeta' }).title).toContain(
    'Opened 2 times',
  );
  await userEvent.click(search);
  await userEvent.keyboard('doc');
  expectSelected(search, 'Doc Zeta');
  await userEvent.keyboard('{ArrowDown}');
  expectSelected(search, 'Doc Alpha');
});

it('persists the count when creating the tab immediately destroys the popup', async () => {
  await openPopup();
  const link = (await quickLinkService.getAll()).find((item) => item.name === 'Doc Favorite')!;
  chromeMock.create.mockImplementationOnce(async () => {
    // Chrome closes the action popup as soon as the newly opened tab gains focus.
    cleanup();
  });
  await userEvent.keyboard('doc{Enter}{Enter}');
  await waitFor(async () => expect((await quickLinkService.getById(link.id))?.openCount).toBe(1));
  expect(chromeMock.sendMessage).toHaveBeenCalledWith({
    type: 'open-quick-link',
    linkId: link.id,
    projectId: 'default',
    targetId: expect.any(String),
  });
  render(<App mode="popup" />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Unfavorite Doc Favorite' }).textContent).toBe('★1'),
  );
});

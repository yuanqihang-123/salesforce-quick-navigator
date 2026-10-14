import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { chromeMock, input, resetChrome } from './chromeMock';
import { App } from '../components/App';
import { environmentService } from '../services/environmentService';
import { projectService } from '../services/projectService';
import { quickLinkService } from '../services/quickLinkService';

const route = '/lightning/o/Account/list?filterName=Recent#accounts';
const uat = {
  id: 'uat',
  name: 'UAT',
  orgDomain: 'app--uat',
  isSandbox: true,
  projectId: 'default',
};
beforeEach(resetChrome);
afterEach(cleanup);

async function openPopup(url = 'https://one.lightning.force.com' + route, projectId?: string) {
  chromeMock.query.mockResolvedValue([{ url }]);
  render(<App mode="popup" />);
  const button = screen.getByRole('button', { name: 'Open current page ↗' }) as HTMLButtonElement;
  if (projectId) await userEvent.selectOptions(await screen.findByLabelText('Project'), projectId);
  await waitFor(() => expect(button.disabled).toBe(false));
  return { button, search: screen.getByRole('searchbox', { name: 'Search links' }) };
}

it('excludes the current Org before opening the original route in another Org without overrides', async () => {
  await environmentService.save(uat);
  const link = await quickLinkService.create({
    ...input,
    route,
    environmentOverrides: { uat: '/lightning/o/Contact/list' },
  });
  const { button } = await openPopup();
  await userEvent.click(button);
  expect(screen.getByRole('dialog').textContent).not.toContain('ONE');
  expect(screen.getByRole('dialog').textContent).toContain('UAT');
  expect(screen.getByRole('dialog').textContent).toContain('1/1');
  expect(chromeMock.create).not.toHaveBeenCalled();
  await userEvent.keyboard('{ArrowRight}{ArrowLeft}');
  expect(screen.getByRole('dialog').textContent).toContain('UAT');
  await userEvent.click(screen.getByRole('button', { name: 'Open link ↗' }));
  await waitFor(() =>
    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'https://app--uat.sandbox.lightning.force.com' + route,
    }),
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect((await quickLinkService.getById(link.id))?.openCount).toBe(0);
});

it('excludes the detected current Org when it is not saved in the selected project', async () => {
  const project = await projectService.create('Other');
  await environmentService.save({ ...uat, projectId: project.id });
  const { button } = await openPopup(undefined, project.id);
  expect(button.disabled).toBe(false);
  await userEvent.click(button);
  expect(screen.getByRole('dialog').textContent).not.toContain('one');
  expect(screen.getByRole('dialog').textContent).toContain('1/1');
  await userEvent.keyboard('{ArrowRight}{Enter}');
  await waitFor(() =>
    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'https://app--uat.sandbox.lightning.force.com' + route,
    }),
  );
});

it('keeps an Org chosen in the dialog on failure for retry', async () => {
  await environmentService.save(uat);
  const { button } = await openPopup();
  chromeMock.create.mockRejectedValueOnce(new Error('Unable to open tab'));
  await userEvent.click(button);
  await userEvent.keyboard('{ArrowRight}');
  expect(screen.getByRole('dialog').textContent).toContain('UAT');
  await userEvent.keyboard('{Enter}');
  expect((await screen.findByRole('alert')).textContent).toBe('Unable to open tab');
  expect(screen.getByRole('dialog').textContent).toContain('UAT');
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(chromeMock.create).toHaveBeenCalledTimes(2);
  expect(chromeMock.create).toHaveBeenLastCalledWith({
    url: 'https://app--uat.sandbox.lightning.force.com' + route,
  });
});

it('opens the current-page chooser entirely by keyboard and restores button focus on Escape', async () => {
  await environmentService.save(uat);
  const { button, search } = await openPopup();
  expect(document.activeElement).toBe(search);
  await userEvent.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(button);
  fireEvent.keyDown(button, { key: 'Enter', repeat: true });
  fireEvent.keyDown(button, { key: 'Enter', isComposing: true });
  expect(screen.queryByRole('dialog')).toBeNull();
  await userEvent.keyboard('{Enter}{ArrowRight}{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(button);
  expect(chromeMock.create).not.toHaveBeenCalled();
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(search);
  expect(search.getAttribute('aria-activedescendant')).toBeNull();
  await userEvent.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(button);
  await userEvent.keyboard('{Enter}{ArrowRight}{Enter}');
  await waitFor(() =>
    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'https://app--uat.sandbox.lightning.force.com' + route,
    }),
  );
});

it('allows returning to search with no matching results', async () => {
  await environmentService.save(uat);
  await quickLinkService.create(input);
  const { button, search } = await openPopup();
  await userEvent.keyboard('no match{ArrowDown}');
  expect(document.activeElement).toBe(button);
  expect(search.getAttribute('aria-activedescendant')).toBeNull();
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(search);
  expect((search as HTMLInputElement).value).toBe('no match');
  await userEvent.clear(search);
  await userEvent.keyboard('{ArrowDown}');
  expect(search.getAttribute('aria-activedescendant')).toBe(
    screen.getByRole('button', { name: 'Accounts' }).id,
  );
});

it('preserves normal Tab navigation and traps focus within the Org chooser', async () => {
  await environmentService.save(uat);
  const { button, search } = await openPopup();
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: '+ Add Link' }));
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(button);
  await userEvent.keyboard('{Enter}');
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open link ↗' }));
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  await userEvent.keyboard('{Escape}');
  expect(document.activeElement).toBe(button);
  await userEvent.tab();
  await userEvent.tab();
  expect(document.activeElement).toBe(search);
});

it('revalidates an Org deleted while the current-page chooser is open', async () => {
  await environmentService.save(uat);
  await environmentService.save({ ...uat, id: 'other', name: 'Zeta', orgDomain: 'app--other' });
  const { button } = await openPopup();
  await userEvent.click(button);
  await environmentService.delete('uat');
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(screen.getByRole('dialog').textContent).toContain('Unavailable Org'));
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(chromeMock.create).not.toHaveBeenCalled();
  await userEvent.keyboard('{ArrowRight}{Enter}');
  await waitFor(() =>
    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'https://app--other.sandbox.lightning.force.com' + route,
    }),
  );
});

it('disables the current-page action when there is no other Org but still opens saved links', async () => {
  await quickLinkService.create(input);
  chromeMock.query.mockResolvedValue([{ url: 'https://one.lightning.force.com' + route }]);
  render(<App mode="popup" />);
  const link = await screen.findByRole('button', { name: 'Accounts' });
  await waitFor(() => expect((link as HTMLButtonElement).disabled).toBe(false));
  const button = screen.getByRole('button', { name: 'Open current page ↗' }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  await userEvent.click(button);
  expect(screen.queryByRole('dialog')).toBeNull();
  await userEvent.click(link);
  expect(screen.getByRole('dialog').textContent).toContain('ONE');
});

it('distinguishes sandbox and production Orgs with the same domain', async () => {
  await environmentService.save({ ...uat, orgDomain: 'one' });
  const { button } = await openPopup();
  await userEvent.click(button);
  expect(screen.getByRole('dialog').textContent).toContain('UAT');
  expect(screen.getByRole('dialog').textContent).toContain('1/1');
  await userEvent.keyboard('{Enter}');
  await waitFor(() =>
    expect(chromeMock.create).toHaveBeenCalledWith({
      url: 'https://one.sandbox.lightning.force.com' + route,
    }),
  );
});

it('keeps the current-page action disabled on an unsupported Salesforce route', async () => {
  await environmentService.save(uat);
  chromeMock.query.mockResolvedValue([
    { url: 'https://one.lightning.force.com/lightning/page/home' },
  ]);
  render(<App mode="popup" />);
  await waitFor(() => expect(chromeMock.query).toHaveBeenCalled());
  const button = screen.getByRole('button', { name: 'Open current page ↗' }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  await userEvent.click(button);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(chromeMock.create).not.toHaveBeenCalled();
});

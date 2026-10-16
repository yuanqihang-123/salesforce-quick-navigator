import { beforeEach, expect, it } from 'vitest';
import { chromeMock, resetChrome } from './chromeMock';
import { tabService } from '../services/tabService';
beforeEach(resetChrome);
it('rereads current org at each navigation', async () => {
  chromeMock.query
    .mockResolvedValueOnce([{ url: 'https://one.sandbox.lightning.force.com/' }])
    .mockResolvedValueOnce([{ url: 'https://two.sandbox.my.salesforce-setup.com/' }]);
  await tabService.navigate('/lightning/o/Account/list');
  await tabService.navigate('/lightning/setup/CustomMetadata/home');
  expect(chromeMock.create.mock.calls).toEqual([
    [{ url: 'https://one.sandbox.lightning.force.com/lightning/o/Account/list' }],
    [{ url: 'https://two.sandbox.my.salesforce-setup.com/lightning/setup/CustomMetadata/home' }],
  ]);
});
it('never opens a tab for unsafe URLs or missing current context', async () => {
  await expect(tabService.openNewTab('https://evil.com/')).rejects.toThrow();
  chromeMock.query.mockResolvedValue([{ url: 'https://example.com/' }]);
  await expect(tabService.navigate('/lightning/o/Account/list')).rejects.toThrow();
  chromeMock.query.mockResolvedValue([{}]);
  await expect(tabService.navigate('/lightning/o/Account/list')).rejects.toThrow('Unable to read');
  expect(chromeMock.create).not.toHaveBeenCalled();
});
it('prefills current page and propagates tab failures', async () => {
  chromeMock.query.mockResolvedValue([
    { url: 'https://one.my.salesforce.com/lightning/o/Account/list#here', title: 'Account list' },
  ]);
  expect(await tabService.currentPage()).toMatchObject({
    name: 'Account list',
    route: '/lightning/o/Account/list#here',
  });
  chromeMock.create.mockRejectedValue(new Error('Tab creation failed'));
  await expect(tabService.navigate('/lightning/o/Account/list')).rejects.toThrow(
    'Tab creation failed',
  );
});

it.each(['Deployment Status | Salesforce', 'Deployment Status｜Salesforce'])(
  'removes the Salesforce suffix from the current page name: %s',
  async (title) => {
    chromeMock.query.mockResolvedValue([
      { url: 'https://one.my.salesforce.com/lightning/setup/DeployStatus/home', title },
    ]);
    expect(await tabService.currentPage()).toMatchObject({ name: 'Deployment Status' });
  },
);

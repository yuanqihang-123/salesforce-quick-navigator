import { browser } from 'wxt/browser';
import type { SalesforceDomainType } from '../types';
import { extractRoute, parseOrg, resolveUrl, validateNavigationUrl } from './salesforceUrlResolver';
export const tabService = {
  async getActiveTab(): Promise<{ url: string; title: string }> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url)
      throw new Error(
        'Unable to read the current tab URL. Open the extension on a Salesforce page.',
      );
    return { url: tab.url, title: tab.title ?? '' };
  },
  async openNewTab(url: string, routeDomain?: SalesforceDomainType) {
    validateNavigationUrl(url, routeDomain);
    await browser.tabs.create({ url });
  },
  async navigate(route: string) {
    const tab = await this.getActiveTab();
    await this.openNewTab(resolveUrl(parseOrg(tab.url), route));
  },
  async currentPage() {
    const tab = await this.getActiveTab();
    return {
      name: tab.title.slice(0, 100),
      route: extractRoute(tab.url),
      category: '',
      description: '',
      favorite: false,
    };
  },
  async openSettings() {
    await browser.runtime.openOptionsPage();
  },
};

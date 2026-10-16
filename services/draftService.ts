import { browser } from 'wxt/browser';
import { extractRoute } from './salesforceUrlResolver';
import { validateInput } from './validation';
import { type LinkInput } from '../types';
import { pageName } from './pageName';
const PREFIX = 'draft:';
export const draftService = {
  async create(url: string, title: string): Promise<string> {
    const draft: LinkInput = {
      name: pageName(title) || 'Salesforce Page',
      route: extractRoute(url),
      category: '',
      description: '',
      favorite: false,
    };
    const id = crypto.randomUUID();
    await browser.storage.session.set({ [PREFIX + id]: draft });
    return id;
  },
  async consume(id: string): Promise<LinkInput> {
    const key = PREFIX + id;
    const stored = await browser.storage.session.get(key);
    const draft = validateInput(stored[key]);
    await browser.storage.session.remove(key);
    return draft;
  },
  async discard(id: string): Promise<void> {
    await browser.storage.session.remove(PREFIX + id);
  },
};

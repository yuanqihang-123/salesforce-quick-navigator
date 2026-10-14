import { DEFAULT_PROJECT_ID, type LinkInput, type QuickLink } from '../types';
import { storageService } from './storageService';
import { validateInput, validateLink } from './validation';
import { compareLinks, searchLinks } from './linkQuery';
import { linkIdentity } from './linkIdentity';
export { compareLinks, searchLinks } from './linkQuery';
export const quickLinkService = {
  async getAll() {
    return (await storageService.read()).quickLinks.sort(compareLinks);
  },
  async getById(id: string) {
    return (await this.getAll()).find((link) => link.id === id);
  },
  async create(data: LinkInput): Promise<QuickLink> {
    const input = validateInput(data);
    return storageService.mutate((settings) => {
      if (settings.quickLinks.some((link) => linkIdentity(link) === linkIdentity(input))) {
        throw new Error(
          'A link with this Route and environment overrides already exists in this project.',
        );
      }
      const now = new Date().toISOString();
      const link = validateLink({
        ...input,
        projectId: input.projectId ?? DEFAULT_PROJECT_ID,
        id: crypto.randomUUID(),
        sortOrder: Math.max(-1, ...settings.quickLinks.map((item) => item.sortOrder)) + 1,
        createdAt: now,
        updatedAt: now,
      });
      settings.quickLinks.push(link);
      return link;
    });
  },
  async update(id: string, changes: Partial<LinkInput>): Promise<QuickLink> {
    return storageService.mutate((settings) => {
      const index = settings.quickLinks.findIndex((link) => link.id === id);
      const old = settings.quickLinks[index];
      if (!old) throw new Error('This link no longer exists.');
      const link = validateLink({
        ...old,
        ...validateInput({ ...old, ...changes }),
        updatedAt: new Date().toISOString(),
      });
      if (
        linkIdentity(link) !== linkIdentity(old) &&
        settings.quickLinks.some(
          (item) => item.id !== id && linkIdentity(item) === linkIdentity(link),
        )
      ) {
        throw new Error(
          'A link with this Route and environment overrides already exists in this project.',
        );
      }
      settings.quickLinks[index] = link;
      return link;
    });
  },
  async delete(id: string) {
    await storageService.mutate((settings) => {
      settings.quickLinks = settings.quickLinks.filter((link) => link.id !== id);
    });
  },
  async search(query: string) {
    return searchLinks(await this.getAll(), query);
  },
  async toggleFavorite(id: string) {
    await storageService.mutate((settings) => {
      const link = settings.quickLinks.find((item) => item.id === id);
      if (!link) throw new Error('This link no longer exists.');
      link.favorite = !link.favorite;
      link.updatedAt = new Date().toISOString();
    });
  },
  async move(id: string, direction: -1 | 1) {
    await storageService.mutate((settings) => {
      const projectId = settings.quickLinks.find((link) => link.id === id)?.projectId;
      const ordered = settings.quickLinks
        .filter((link) => link.projectId === projectId)
        .sort(compareLinks);
      const index = ordered.findIndex((link) => link.id === id);
      const neighbor = ordered[index + direction];
      const current = ordered[index];
      if (!current || !neighbor) return;
      ordered[index] = neighbor;
      ordered[index + direction] = current;
      ordered.forEach((link, sortOrder) => {
        if (link.sortOrder !== sortOrder) {
          link.sortOrder = sortOrder;
          link.updatedAt = new Date().toISOString();
        }
      });
    });
  },
};

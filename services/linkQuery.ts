import type { QuickLink } from '../types';
export const compareLinks = (a: QuickLink, b: QuickLink) =>
  a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
export function searchLinks(links: QuickLink[], query: string): QuickLink[] {
  const term = query.trim().toLowerCase();
  return links
    .filter((link) =>
      [link.name, link.route, link.category, link.description ?? ''].some((text) =>
        text.toLowerCase().includes(term),
      ),
    )
    .sort(compareLinks);
}
export function groupLinks(links: QuickLink[]): [string, QuickLink[]][] {
  const groups = new Map<string, QuickLink[]>();
  for (const link of links.filter((item) => !item.favorite)) {
    const category = link.category || 'Others';
    groups.set(category, [...(groups.get(category) ?? []), link]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function navigationLinks(
  links: QuickLink[],
  query: string,
  favoritesEnabled = true,
): QuickLink[] {
  const visible = searchLinks(links, query);
  if (!favoritesEnabled) return visible.sort((a, b) => (b.openCount ?? 0) - (a.openCount ?? 0));
  return [
    ...visible.filter((link) => link.favorite),
    ...groupLinks(visible).flatMap(([, members]) => members),
  ].sort((a, b) => (b.openCount ?? 0) - (a.openCount ?? 0));
}

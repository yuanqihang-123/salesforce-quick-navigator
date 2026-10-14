import type { LinkInput } from '../../types';
import type { BookmarkCandidate, BookmarkNode } from '../../types/bookmarks';
import { extractRoute, parseOrg } from '../salesforceUrlResolver';
import { validateInput } from '../validation';

export function collectBookmarks(bars: BookmarkNode[], projectId: string) {
  const candidates: BookmarkCandidate[] = [];
  let skipped = 0;
  function visit(nodes: BookmarkNode[], folders: string[]) {
    for (const node of nodes) {
      if (!node.url) {
        visit(node.children ?? [], [...folders, node.title]);
        continue;
      }
      let org;
      try {
        org = parseOrg(node.url);
      } catch {
        continue;
      }
      try {
        // Standard Lightning routes retain the existing automatic domain selection.
        let routeDomain: LinkInput['routeDomain'];
        let route: string;
        try {
          route = extractRoute(node.url);
        } catch {
          routeDomain = org.domainType;
          route = extractRoute(node.url, routeDomain);
        }
        candidates.push({
          id: node.id,
          org,
          input: validateInput({
            name: node.title.trim().slice(0, 100) || 'Salesforce Page',
            route,
            ...(routeDomain ? { routeDomain } : {}),
            category: folders.filter(Boolean).join(' / ') || 'Bookmarks',
            description: '',
            favorite: false,
            projectId,
          }),
        });
      } catch {
        skipped++;
      }
    }
  }
  for (const bar of bars) visit(bar.children ?? [], []);
  return { candidates, skipped };
}

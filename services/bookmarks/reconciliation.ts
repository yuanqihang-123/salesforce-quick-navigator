import type { AppSettings, LinkInput } from '../../types';
import type { BookmarkBinding, BookmarkCandidate, BookmarkSyncState } from '../../types/bookmarks';
import { validateLink } from '../validation';
import { linkIdentity } from '../linkIdentity';

// Only fields supplied by a bookmark are managed. Counts, stars and order are user-owned.
function snapshot(link: LinkInput): string {
  return JSON.stringify([
    link.name,
    link.route,
    link.category,
    link.description ?? '',
    link.projectId,
    link.routeDomain ?? null,
    Object.entries(link.environmentOverrides ?? {}).sort(([a], [b]) => a.localeCompare(b)),
  ]);
}

export function reconcileBookmarks(
  settings: AppSettings,
  state: BookmarkSyncState,
  candidates: BookmarkCandidate[],
  skipped: number,
) {
  const links = new Map(settings.quickLinks.map((link) => [link.id, link]));
  const previous = state.bindings;
  const next: Record<string, BookmarkBinding> = {};
  const groups = new Map<string, BookmarkCandidate[]>();
  const retained = new Set<string>();
  for (const candidate of candidates) {
    const binding = previous[candidate.id];
    const current = binding && links.get(binding.linkId);
    if (
      binding &&
      (binding.ignored || !current || (binding.owned && snapshot(current) !== binding.snapshot))
    ) {
      // A manual edit/delete takes ownership permanently until the bookmark is removed.
      next[candidate.id] = { ...binding, ignored: true };
      retained.add(binding.linkId);
      continue;
    }
    const identity = linkIdentity(candidate.input);
    const group = groups.get(identity) ?? [];
    group.push(candidate);
    groups.set(identity, group);
  }
  const used = new Set<string>();
  let sortOrder = Math.max(-1, ...settings.quickLinks.map((link) => link.sortOrder)) + 1;
  const now = new Date().toISOString();
  for (const [identity, group] of groups) {
    const first = group[0]!;
    let link = settings.quickLinks.find(
      (item) => linkIdentity(item) === identity && !used.has(item.id),
    );
    // Keep the link ID (and open count) when a single source changes its route.
    if (!link) {
      for (const candidate of group) {
        const binding = previous[candidate.id];
        const old = binding && links.get(binding.linkId);
        if (
          !binding?.owned ||
          !old ||
          retained.has(old.id) ||
          used.has(old.id) ||
          snapshot(old) !== binding.snapshot
        )
          continue;
        const otherSources = candidates.filter((source) => previous[source.id]?.linkId === old.id);
        if (otherSources.every((source) => linkIdentity(source.input) === identity)) {
          link = old;
          break;
        }
      }
    }
    const owned =
      !link ||
      (Object.values(previous).some(
        (binding) =>
          binding.linkId === link!.id &&
          binding.owned &&
          !binding.ignored &&
          binding.snapshot === snapshot(link!),
      ) &&
        !retained.has(link.id));
    if (!link) {
      link = validateLink({
        ...first.input,
        id: crypto.randomUUID(),
        sortOrder: sortOrder++,
        openCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      settings.quickLinks.push(link);
      links.set(link.id, link);
    } else if (owned && snapshot(link) !== snapshot(first.input)) {
      Object.assign(link, first.input, {
        favorite: link.favorite,
        routeDomain: first.input.routeDomain,
        updatedAt: now,
      });
    }
    used.add(link.id);
    for (const candidate of group)
      next[candidate.id] = { linkId: link.id, snapshot: snapshot(link), owned };
  }
  // Delete only unedited links managed by sources that disappeared or merged.
  const removable = new Set(
    Object.values(previous)
      .filter((binding) => {
        const link = links.get(binding.linkId);
        return (
          binding.owned &&
          !binding.ignored &&
          link &&
          snapshot(link) === binding.snapshot &&
          !used.has(link.id) &&
          !retained.has(link.id)
        );
      })
      .map((binding) => binding.linkId),
  );
  settings.quickLinks = settings.quickLinks.filter((link) => !removable.has(link.id));
  state.bindings = next;
  state.matched = candidates.length;
  state.skipped = skipped;
  state.lastSyncedAt = now;
  delete state.error;
}

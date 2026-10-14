import type { AppSettings, QuickLink } from '../types';
import { linkIdentity } from './linkIdentity';
/** Merge identities before links, remapping equivalent Orgs from other browsers. */
export function mergeBackup(settings: AppSettings, backup: AppSettings) {
  for (const project of backup.projects) {
    if (!settings.projects.some((item) => item.id === project.id)) settings.projects.push(project);
  }
  const environmentIds = new Map<string, string>();
  for (const env of backup.environments) {
    const existing = settings.environments.find((item) => item.id === env.id);
    if (
      existing &&
      (existing.orgDomain !== env.orgDomain ||
        existing.isSandbox !== env.isSandbox ||
        existing.projectId !== env.projectId)
    ) {
      throw new Error(`Environment ID conflict: ${env.name}. Existing data was not changed.`);
    }
    const equivalent = settings.environments.find(
      (item) =>
        item.projectId === env.projectId &&
        item.orgDomain === env.orgDomain &&
        item.isSandbox === env.isSandbox,
    );
    const target = existing ?? equivalent;
    environmentIds.set(env.id, target?.id ?? env.id);
    if (!target) settings.environments.push(env);
  }
  const ids = new Set(settings.quickLinks.map((link) => link.id));
  const identities = new Set(settings.quickLinks.map(linkIdentity));
  const additions: QuickLink[] = backup.quickLinks
    .filter((link) => !ids.has(link.id))
    .map((link) => {
      if (!link.environmentOverrides) return link;
      const overrides = Object.fromEntries(
        Object.entries(link.environmentOverrides).map(([id, route]) => [
          environmentIds.get(id) ?? id,
          route,
        ]),
      );
      return { ...link, environmentOverrides: overrides };
    })
    .filter((link) => {
      const identity = linkIdentity(link);
      if (identities.has(identity)) return false;
      identities.add(identity);
      return true;
    });
  settings.quickLinks.push(...additions);
  return { imported: additions.length, skipped: backup.quickLinks.length - additions.length };
}

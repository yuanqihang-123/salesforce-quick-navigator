import { requestBackground } from './backgroundClient';
import type { QuickLink, SalesforceEnvironment } from '../types';
import { storageService } from './storageService';
import { environmentOrg } from './environmentService';
import { extractRoute, parseOrg, resolveUrl } from './salesforceUrlResolver';
import { tabService } from './tabService';
export function linkRoute(link: QuickLink, environment?: SalesforceEnvironment): string {
  const overrides = link.environmentOverrides;
  return environment && overrides && Object.hasOwn(overrides, environment.id)
    ? overrides[environment.id]!
    : link.route;
}
async function targetEnvironment(id: string, projectId: string) {
  const env = (await storageService.read()).environments.find(
    (item) => item.id === id && item.projectId === projectId,
  );
  if (!env) throw new Error('Target environment no longer exists in this project.');
  return env;
}
export const navigationService = {
  async requestOpenLink(link: QuickLink, projectId: string, targetId: string) {
    await requestBackground(
      { type: 'open-quick-link', linkId: link.id, projectId, targetId },
      'Unable to open link in the background. Reload the extension and try again.',
    );
  },
  async openLink(link: QuickLink, projectId: string, targetId: string) {
    const settings = await storageService.read();
    const stored = settings.quickLinks.find(
      (item) => item.id === link.id && item.projectId === projectId,
    );
    if (!stored) throw new Error('Link no longer exists in this project.');
    if (!targetId) {
      const current = await tabService.getActiveTab();
      const org = parseOrg(current.url);
      const env = settings.environments.find(
        (item) =>
          item.projectId === projectId &&
          item.orgDomain === org.orgDomain &&
          item.isSandbox === org.isSandbox,
      );
      await tabService.openNewTab(
        resolveUrl(org, linkRoute(stored, env), stored.routeDomain),
        stored.routeDomain,
      );
    } else {
      const env = await targetEnvironment(targetId, projectId);
      await tabService.openNewTab(
        resolveUrl(environmentOrg(env), linkRoute(stored, env), stored.routeDomain),
        stored.routeDomain,
      );
    }
    await storageService.mutate((latest) => {
      const opened = latest.quickLinks.find(
        (item) => item.id === stored.id && item.projectId === projectId,
      );
      if (opened) opened.openCount = Math.min(Number.MAX_SAFE_INTEGER, (opened.openCount ?? 0) + 1);
    });
  },
  async openCurrentPage(projectId: string, targetId: string) {
    const current = await tabService.getActiveTab();
    const org = targetId
      ? environmentOrg(await targetEnvironment(targetId, projectId))
      : parseOrg(current.url);
    await tabService.openNewTab(resolveUrl(org, extractRoute(current.url)));
  },
};

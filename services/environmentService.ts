import { DEFAULT_PROJECT_ID, type SalesforceEnvironment, type SalesforceOrg } from '../types';
import { storageService } from './storageService';
import { parseOrg } from './salesforceUrlResolver';
import { validateEnvironment } from './validation/environments';
export function environmentOrg(environment: SalesforceEnvironment): SalesforceOrg {
  return parseOrg(
    `https://${environment.orgDomain}${environment.isSandbox ? '.sandbox' : ''}.lightning.force.com/`,
  );
}
export const environmentService = {
  async save(data: SalesforceEnvironment) {
    const environment = validateEnvironment(data);
    await storageService.mutate((settings) => {
      const index = settings.environments.findIndex((env) => env.id === environment.id);
      if (index < 0) settings.environments.push(environment);
      else {
        const visited = settings.environments[index]?.lastVisitedAt;
        if (visited && visited > (environment.lastVisitedAt ?? ''))
          environment.lastVisitedAt = visited;
        settings.environments[index] = environment;
      }
      // Moving an environment removes overrides that would cross a project boundary.
      for (const link of settings.quickLinks) {
        if (
          link.projectId !== environment.projectId &&
          link.environmentOverrides &&
          Object.hasOwn(link.environmentOverrides, environment.id)
        ) {
          delete link.environmentOverrides[environment.id];
          link.updatedAt = new Date().toISOString();
        }
      }
    });
  },
  async remember(url: string) {
    let org: SalesforceOrg;
    try {
      org = parseOrg(url);
    } catch {
      return;
    }
    await storageService.mutate((settings) => {
      const matches = settings.environments.filter(
        (env) => env.orgDomain === org.orgDomain && env.isSandbox === org.isSandbox,
      );
      const lastVisitedAt = new Date().toISOString();
      if (matches.length)
        matches.forEach((env) => {
          env.lastVisitedAt = lastVisitedAt;
        });
      else
        settings.environments.push({
          id: crypto.randomUUID(),
          name: (org.environmentName || org.orgDomain).toUpperCase(),
          orgDomain: org.orgDomain,
          isSandbox: org.isSandbox,
          projectId: DEFAULT_PROJECT_ID,
          lastVisitedAt,
        });
    });
  },
  async delete(id: string) {
    await storageService.mutate((settings) => {
      settings.environments = settings.environments.filter((env) => env.id !== id);
      for (const link of settings.quickLinks) {
        if (link.environmentOverrides && Object.hasOwn(link.environmentOverrides, id)) {
          delete link.environmentOverrides[id];
          link.updatedAt = new Date().toISOString();
        }
      }
    });
  },
};

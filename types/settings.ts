import type { SalesforceEnvironment, SalesforceProject } from './environment';
import type { QuickLink } from './quickLink';
export interface AppSettings {
  schemaVersion: 2;
  favoritesEnabled?: boolean;
  quickLinks: QuickLink[];
  projects: SalesforceProject[];
  environments: SalesforceEnvironment[];
}
export const DEFAULT_PROJECT_ID = 'default';
export function defaultSettings(): AppSettings {
  return {
    schemaVersion: 2,
    favoritesEnabled: false,
    quickLinks: [],
    projects: [{ id: DEFAULT_PROJECT_ID, name: 'Default' }],
    environments: [],
  };
}

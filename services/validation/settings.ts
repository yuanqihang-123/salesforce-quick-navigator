import { defaultSettings, DEFAULT_PROJECT_ID, type AppSettings } from '../../types';
import { validateLink } from './links';
import { validateEnvironment, validateProject } from './environments';
import { collection, record } from './primitives';
export function validateSettings(value: unknown): AppSettings {
  const data = record(value);
  if (data.schemaVersion !== 1 && data.schemaVersion !== 2)
    throw new Error('Incompatible schema version. Expected version 1 or 2.');
  if (data.favoritesEnabled !== undefined && typeof data.favoritesEnabled !== 'boolean')
    throw new Error('Favorites enabled must be a boolean.');
  const favoritesEnabled = data.favoritesEnabled ?? false;
  const legacy = data.schemaVersion === 1;
  const quickLinks = collection(data.quickLinks, 'Link', validateLink);
  if (legacy)
    return {
      ...defaultSettings(),
      favoritesEnabled,
      quickLinks: quickLinks.map((link) => {
        // V1 backups do not contain project/environment state.
        const { environmentOverrides: _overrides, projectId: _project, ...base } = link;
        return { ...base, projectId: DEFAULT_PROJECT_ID };
      }),
    };
  const projects = collection(data.projects, 'Project', validateProject);
  const environments = collection(data.environments, 'Environment', validateEnvironment);
  const projectIds = new Set(projects.map((project) => project.id));
  if (!projectIds.has(DEFAULT_PROJECT_ID)) throw new Error('The Default project is required.');
  for (const environment of environments) {
    if (!projectIds.has(environment.projectId))
      throw new Error(`Environment ${environment.name}: unknown project.`);
  }
  const identities = environments.map(
    (env) => `${env.projectId}:${env.orgDomain}:${env.isSandbox}`,
  );
  if (new Set(identities).size !== identities.length)
    throw new Error('Duplicate environment in a project.');
  for (const link of quickLinks) {
    link.projectId ??= DEFAULT_PROJECT_ID;
    if (!projectIds.has(link.projectId)) throw new Error(`Link ${link.name}: unknown project.`);
    for (const envId of Object.keys(link.environmentOverrides ?? {})) {
      if (!environments.some((env) => env.id === envId && env.projectId === link.projectId))
        throw new Error(`Link ${link.name}: override environment is outside its project.`);
    }
  }
  return { schemaVersion: 2, favoritesEnabled, quickLinks, projects, environments };
}

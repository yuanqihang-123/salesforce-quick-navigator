import { DEFAULT_PROJECT_ID } from '../types';
import { storageService } from './storageService';
import { validateProject } from './validation/environments';
export const projectService = {
  async create(name: string) {
    const project = validateProject({ id: crypto.randomUUID(), name });
    await storageService.mutate((settings) => {
      settings.projects.push(project);
    });
    return project;
  },
  async rename(id: string, name: string) {
    const replacement = validateProject({ id, name });
    await storageService.mutate((settings) => {
      const project = settings.projects.find((item) => item.id === id);
      if (!project) throw new Error('Project no longer exists.');
      project.name = replacement.name;
    });
  },
  async delete(id: string) {
    if (id === DEFAULT_PROJECT_ID) throw new Error('The Default project cannot be deleted.');
    await storageService.mutate((settings) => {
      const envIds = new Set(
        settings.environments.filter((env) => env.projectId === id).map((env) => env.id),
      );
      settings.projects = settings.projects.filter((project) => project.id !== id);
      settings.environments = settings.environments.filter((env) => !envIds.has(env.id));
      settings.quickLinks = settings.quickLinks.filter((link) => link.projectId !== id);
    });
  },
};

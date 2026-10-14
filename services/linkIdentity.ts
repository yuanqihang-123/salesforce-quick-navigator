import { DEFAULT_PROJECT_ID, type LinkInput } from '../types';

/** Inputs must be validated first so full Salesforce URLs become relative routes. */
export function linkIdentity(link: LinkInput): string {
  return JSON.stringify([
    link.projectId ?? DEFAULT_PROJECT_ID,
    link.route,
    Object.entries(link.environmentOverrides ?? {}).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    ),
    link.routeDomain ?? null,
  ]);
}

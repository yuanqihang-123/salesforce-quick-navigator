import type { SalesforceEnvironment, SalesforceOrg } from '../types';

export interface OrgChoice {
  id: string;
  name: string;
  isSandbox: boolean;
}

export function orgChoices(
  environments: SalesforceEnvironment[],
  org?: SalesforceOrg,
): OrgChoice[] {
  const choices: OrgChoice[] = [...environments].sort(
    (a, b) =>
      (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? '') || a.name.localeCompare(b.name),
  );
  if (
    org &&
    !environments.some((env) => env.orgDomain === org.orgDomain && env.isSandbox === org.isSandbox)
  ) {
    choices.unshift({
      id: '',
      name: org.environmentName || org.orgDomain,
      isSandbox: org.isSandbox,
    });
  }
  return choices;
}

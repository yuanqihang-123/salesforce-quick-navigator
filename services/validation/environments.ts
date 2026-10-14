import type { SalesforceEnvironment, SalesforceProject } from '../../types';
import { parseOrg } from '../salesforceUrlResolver';
import { id, name, record, timestamp } from './primitives';
export function validateProject(value: unknown): SalesforceProject {
  const data = record(value);
  return { id: id(data.id), name: name(data.name) };
}
export function validateEnvironment(value: unknown): SalesforceEnvironment {
  const data = record(value);
  if (typeof data.orgDomain !== 'string' || typeof data.isSandbox !== 'boolean')
    throw new Error('Invalid Salesforce environment.');
  const hostname = `${data.orgDomain}${data.isSandbox ? '.sandbox' : ''}.lightning.force.com`;
  const org = parseOrg(`https://${hostname}/`);
  if (org.orgDomain !== data.orgDomain || org.isSandbox !== data.isSandbox)
    throw new Error('Invalid Org Domain.');
  const environment: SalesforceEnvironment = {
    id: id(data.id),
    name: name(data.name),
    orgDomain: data.orgDomain,
    isSandbox: data.isSandbox,
    projectId: id(data.projectId),
  };
  if (data.lastVisitedAt !== undefined) environment.lastVisitedAt = timestamp(data.lastVisitedAt);
  return environment;
}

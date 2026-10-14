export interface SalesforceEnvironment {
  id: string;
  name: string;
  orgDomain: string;
  isSandbox: boolean;
  projectId: string;
  lastVisitedAt?: string;
}
export interface SalesforceProject {
  id: string;
  name: string;
}

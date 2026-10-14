export type SalesforceDomainType = 'lightning' | 'setup' | 'my-domain';
export interface SalesforceOrg {
  orgDomain: string;
  environmentName?: string;
  isSandbox: boolean;
  domainType: SalesforceDomainType;
  hostname: string;
}

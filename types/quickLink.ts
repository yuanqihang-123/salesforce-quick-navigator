import type { SalesforceDomainType } from './salesforce';
export interface QuickLink {
  id: string;
  name: string;
  route: string;
  category: string;
  description?: string;
  favorite: boolean;
  sortOrder: number;
  openCount?: number;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  environmentOverrides?: Record<string, string>;
  routeDomain?: SalesforceDomainType;
}
export type LinkInput = Pick<
  QuickLink,
  | 'name'
  | 'route'
  | 'category'
  | 'description'
  | 'favorite'
  | 'projectId'
  | 'environmentOverrides'
  | 'routeDomain'
>;

export const EMPTY_LINK_INPUT: LinkInput = {
  name: '',
  route: '',
  category: '',
  description: '',
  favorite: false,
};

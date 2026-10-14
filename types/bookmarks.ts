import type { LinkInput, SalesforceOrg } from './index';

export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  folderType?: string;
  children?: BookmarkNode[];
}
export interface BookmarkCandidate {
  id: string;
  input: LinkInput;
  org: SalesforceOrg;
}

export interface BookmarkBinding {
  linkId: string;
  snapshot: string;
  owned: boolean;
  ignored?: boolean;
}
export interface BookmarkSyncState {
  enabled: boolean;
  dismissed: boolean;
  projectId: string;
  bindings: Record<string, BookmarkBinding>;
  lastSyncedAt?: string;
  matched: number;
  skipped: number;
  error?: string;
}
export function defaultBookmarkSyncState(): BookmarkSyncState {
  return {
    enabled: false,
    dismissed: false,
    projectId: 'default',
    bindings: {},
    matched: 0,
    skipped: 0,
  };
}

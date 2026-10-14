export type BackgroundRequest =
  | { type: 'open-quick-link'; linkId: string; projectId: string; targetId: string }
  | { type: 'bookmark-sync'; action: 'enable'; projectId: string }
  | { type: 'bookmark-sync'; action: 'disable' | 'refresh' };

export interface BackgroundResponse {
  ok: boolean;
  error?: string;
}

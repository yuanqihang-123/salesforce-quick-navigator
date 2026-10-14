import { useEffect, useRef } from 'react';
import type { LinkInput } from '../types';
import { DEFAULT_PROJECT_ID } from '../types';
import { draftService } from '../services/draftService';
import { errorText } from '../utils/errorText';
export function usePendingDraft(
  loading: boolean,
  onDraft: (draft: LinkInput) => void,
  onError: (message: string) => void,
) {
  const consumed = useRef(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('draft');
    if (loading || !id || consumed.current) return;
    consumed.current = true;
    void draftService
      .consume(id)
      .then((draft) => onDraft({ ...draft, projectId: DEFAULT_PROJECT_ID }))
      .catch((error) => onError(errorText(error)));
    window.history.replaceState(null, '', window.location.pathname);
  }, [loading, onDraft, onError]);
}

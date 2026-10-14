import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { bookmarkSyncService } from '../services/bookmarkSyncService';
import { requestBackground } from '../services/backgroundClient';
import { defaultBookmarkSyncState } from '../types/bookmarks';
import { errorText } from '../utils/errorText';

function request(action: 'disable' | 'refresh'): Promise<void>;
function request(action: 'enable', projectId: string): Promise<void>;
function request(action: 'enable' | 'disable' | 'refresh', projectId?: string) {
  return requestBackground(
    action === 'enable'
      ? { type: 'bookmark-sync', action, projectId: projectId! }
      : { type: 'bookmark-sync', action },
    'Unable to sync bookmarks. Reload the extension and try again.',
  );
}
export function useBookmarkSync() {
  const [state, setState] = useState(defaultBookmarkSyncState);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  const mounted = useRef(false);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const requestId = ++sequence.current;
    try {
      const value = await bookmarkSyncService.read();
      if (mounted.current && requestId === sequence.current) setState(value);
      return value;
    } catch (failure) {
      if (mounted.current && requestId === sequence.current) setError(errorText(failure));
    } finally {
      if (mounted.current && requestId === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = bookmarkSyncService.subscribe(() => {
      void reload();
    });
    void reload().then((value) => {
      if (value?.enabled && mounted.current)
        void request('refresh').catch((failure) => {
          if (mounted.current) setError(errorText(failure));
        });
    });
    return () => {
      mounted.current = false;
      sequence.current++;
      unsubscribe();
    };
  }, [reload]);
  async function run(operation: () => Promise<void>) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
      await reload();
    } catch (failure) {
      if (mounted.current) setError(errorText(failure));
    } finally {
      active.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return {
    state,
    loading,
    busy,
    error: error || state.error,
    enable: (projectId: string) =>
      run(async () => {
        // Request immediately from the click handler, before any storage reads.
        const granted = await browser.permissions.request({ permissions: ['bookmarks'] });
        if (!granted) {
          await bookmarkSyncService.dismiss();
          throw new Error('Bookmark access was not granted. You can enable it later in Settings.');
        }
        await request('enable', projectId);
      }),
    disable: () => run(() => request('disable')),
    refresh: () => run(() => request('refresh')),
    dismiss: () => run(() => bookmarkSyncService.dismiss()),
  };
}

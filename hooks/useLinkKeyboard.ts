import { useRef, useState, type KeyboardEvent } from 'react';
import type { QuickLink } from '../types';
interface Options {
  links: QuickLink[];
  query: string;
  projectId: string;
  enabled: boolean;
  busy: boolean;
  canOpenCurrentPage: boolean;
  onOpen: (link: QuickLink) => void;
}
/** Keep focus in search for results; move actual focus to the current-page button at either end. */
export function useLinkKeyboard({
  links,
  query,
  projectId,
  enabled,
  busy,
  canOpenCurrentPage,
  onOpen,
}: Options) {
  const searchRef = useRef<HTMLInputElement>(null);
  const currentPageRef = useRef<HTMLButtonElement>(null);
  const scope = JSON.stringify([projectId, query]);
  // null marks button focus and clears the highlighted link, including filtered defaults.
  const [selection, setSelection] = useState<{ scope: string; id: string | null }>();
  const explicit =
    selection?.scope === scope ? links.find((link) => link.id === selection.id) : undefined;
  const active =
    enabled && !(selection?.scope === scope && selection.id === null)
      ? (explicit ?? (query.trim() ? links[0] : undefined))
      : undefined;
  function onCurrentPageFocus() {
    setSelection({ scope, id: null });
  }
  function onCurrentPageKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey) {
      if (event.key === 'Enter') event.preventDefault();
      return;
    }
    if (event.key === 'Enter' && event.repeat) event.preventDefault();
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    if (!enabled || busy) return;
    const link = event.key === 'ArrowDown' ? links[0] : links[links.length - 1];
    setSelection({ scope, id: link?.id ?? null });
    searchRef.current?.focus();
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (!enabled || busy) return;
    if (event.key === 'Enter') {
      if (active && !event.repeat) onOpen(active);
      return;
    }
    const index = active ? links.findIndex((link) => link.id === active.id) : -1;
    if (
      canOpenCurrentPage &&
      (!links.length ||
        (event.key === 'ArrowUp' && index <= 0) ||
        (event.key === 'ArrowDown' && index === links.length - 1))
    ) {
      currentPageRef.current?.focus();
      return;
    }
    if (!links.length) return;
    const next =
      event.key === 'ArrowDown'
        ? (index + 1) % links.length
        : index < 0
          ? links.length - 1
          : (index - 1 + links.length) % links.length;
    const link = links[next];
    if (link) setSelection({ scope, id: link.id });
  }
  return {
    activeId: active?.id,
    onKeyDown,
    searchRef,
    currentPageRef,
    onCurrentPageFocus,
    onCurrentPageKeyDown,
  };
}

import type { KeyboardEventHandler, RefObject } from 'react';
import { linkButtonId } from '../links/QuickLinkItem';
export function PopupSearch({
  query,
  onChange,
  activeId,
  onKeyDown,
  inputRef,
  canOpenCurrentPage,
}: {
  query: string;
  onChange: (query: string) => void;
  activeId?: string;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  inputRef: RefObject<HTMLInputElement | null>;
  canOpenCurrentPage: boolean;
}) {
  return (
    <>
      <label className="search">
        <span className="sr-only">Search links</span>
        <input
          ref={inputRef}
          autoFocus
          type="search"
          placeholder="Search links…"
          value={query}
          aria-controls="popup-link-results"
          aria-activedescendant={activeId ? linkButtonId(activeId) : undefined}
          aria-describedby={canOpenCurrentPage ? 'popup-keyboard-hint' : undefined}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </label>
      {canOpenCurrentPage && (
        <span id="popup-keyboard-hint" className="hint popup-keyboard-hint">
          ↑ ↓ Navigate links & current page · ↵ Choose Org
        </span>
      )}
    </>
  );
}

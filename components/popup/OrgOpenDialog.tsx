import { useEffect, useRef, useState } from 'react';
import { dialogKeyboard } from '../../utils/dialogKeyboard';
import { errorText } from '../../utils/errorText';
import type { OrgChoice } from '../../services/orgChoices';

export function OrgOpenDialog({
  choices,
  defaultTarget,
  onOpen,
  onCancel,
}: {
  choices: OrgChoice[];
  defaultTarget: string;
  onOpen: (id: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState(defaultTarget);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const opening = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const index = choices.findIndex((choice) => choice.id === target);
  const choice = choices[index];
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  function move(direction: number) {
    const next = choices[(index + direction + choices.length) % choices.length];
    if (next) setTarget(next.id);
  }
  async function open() {
    if (opening.current || !choice) return;
    opening.current = true;
    setBusy(true);
    setError('');
    try {
      await onOpen(choice.id);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      opening.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <div
        ref={dialog}
        className="dialog org-open-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-open-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Tab' && document.activeElement === dialog.current) {
            event.preventDefault();
            const buttons =
              dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
            (event.shiftKey ? buttons?.[buttons.length - 1] : buttons?.[0])?.focus();
          } else dialogKeyboard(dialog, busy, onCancel)(event);
          if (event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey)
            return;
          if (['ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            if (busy) return;
            if (event.key === 'Enter') {
              if (!event.repeat) {
                if ((event.target as HTMLElement).dataset.action === 'cancel') onCancel();
                else void open();
              }
            } else move(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        <h2 id="org-open-title">Open in Org</h2>
        <div className="org-carousel">
          <button
            aria-label="Previous Org"
            disabled={busy || choices.length < 2}
            onClick={() => move(-1)}
          >
            ‹
          </button>
          <div aria-live="polite" aria-atomic="true">
            <strong>{choice?.name ?? 'Unavailable Org'}</strong>
            {choice && (
              <small>
                {index + 1}/{choices.length}
              </small>
            )}
          </div>
          <button
            aria-label="Next Org"
            disabled={busy || choices.length < 2}
            onClick={() => move(1)}
          >
            ›
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <p className="hint">← → Switch · ↵ Open · Esc Close</p>
        <div className="actions">
          <button data-action="cancel" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button className="primary" disabled={busy || !choice} onClick={() => void open()}>
            {busy ? 'Opening…' : 'Open link ↗'}
          </button>
        </div>
      </div>
    </div>
  );
}

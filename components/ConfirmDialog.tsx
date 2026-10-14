import { useEffect, useRef, useState } from 'react';
export function ConfirmDialog({
  title,
  message,
  action,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  action: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cancel = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    cancel.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onCancel();
          if (event.key === 'Tab') {
            event.preventDefault();
            (document.activeElement === cancel.current ? confirm : cancel).current?.focus();
          }
        }}
      >
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button ref={cancel} disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            ref={confirm}
            className="danger"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onConfirm()
                .catch((failure) =>
                  setError(failure instanceof Error ? failure.message : 'Operation failed.'),
                )
                .finally(() => setBusy(false));
            }}
          >
            {busy ? 'Working…' : action}
          </button>
        </div>
      </div>
    </div>
  );
}

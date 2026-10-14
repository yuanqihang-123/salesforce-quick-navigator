export function ErrorBanner({ error, onDismiss }: { error: string; onDismiss?: () => void }) {
  if (!error) return null;
  return (
    <div role="alert" className="error banner">
      {error}
      {onDismiss && (
        <button aria-label="Dismiss error" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  );
}

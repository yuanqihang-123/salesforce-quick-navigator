import { tabService } from '../services/tabService';
export function AppHeader({
  popup = false,
  onError,
}: {
  popup?: boolean;
  onError: (error: string) => void;
}) {
  return (
    <header>
      <img className="brand-mark" src="/icon/arrow.svg" alt="" aria-hidden="true" />
      <div>
        <h1>Salesforce Quick Navigator</h1>
        {!popup && <p className="hint">Settings · Organize your Salesforce shortcuts</p>}
      </div>
      {popup && (
        <button
          aria-label="Settings"
          className="settings-button"
          onClick={() => {
            void tabService.openSettings().catch(() => onError('Unable to open Settings.'));
          }}
        >
          ⚙
        </button>
      )}
    </header>
  );
}

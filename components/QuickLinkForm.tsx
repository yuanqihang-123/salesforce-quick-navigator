import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { LinkInput, QuickLink, SalesforceEnvironment, SalesforceProject } from '../types';
import { extractRoute } from '../services/salesforceUrlResolver';
import { validateInput } from '../services/validation';
import { linkIdentity } from '../services/linkIdentity';
import { dialogKeyboard } from '../utils/dialogKeyboard';
import { LinkFields } from './links/LinkFields';
import { RouteOverrides } from './links/RouteOverrides';
interface Props {
  initial: LinkInput & { id?: string };
  links: QuickLink[];
  projects?: SalesforceProject[];
  favoritesEnabled?: boolean;
  environments?: SalesforceEnvironment[];
  onSave: (input: LinkInput) => Promise<void>;
  onCancel: () => void;
}
export function QuickLinkForm({
  initial,
  links,
  projects = [],
  environments = [],
  favoritesEnabled = false,
  onSave,
  onCancel,
}: Props) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const saving = useRef(false);
  useEffect(() => {
    const previous = document.activeElement;
    container.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  let identity: string | undefined;
  try {
    identity = linkIdentity({
      ...data,
      route: extractRoute(data.route, data.routeDomain),
      environmentOverrides: Object.fromEntries(
        Object.entries(data.environmentOverrides ?? {}).map(([id, route]) => [
          id,
          extractRoute(route, data.routeDomain),
        ]),
      ),
    });
  } catch {
    /* Report invalid routes on submit. */
  }
  const duplicates = links.filter(
    (link) =>
      link.id !== initial.id &&
      linkIdentity(link) === identity &&
      (!initial.id || identity !== linkIdentity(initial)),
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setError('');
    setBusy(true);
    try {
      await onSave(validateInput(data));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save the link.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <div
        ref={container}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
        onKeyDown={dialogKeyboard(container, busy, onCancel, form)}
      >
        <h2 id="form-title">{initial.id ? 'Edit Quick Link' : 'Add Quick Link'}</h2>
        <form ref={form} onSubmit={(event) => void submit(event)}>
          <LinkFields
            data={data}
            favoritesEnabled={favoritesEnabled}
            links={links}
            projects={projects}
            onError={setError}
            onChange={(changes) => setData((previous) => ({ ...previous, ...changes }))}
          />
          <RouteOverrides
            environments={environments.filter(
              (env) => env.projectId === (data.projectId ?? 'default'),
            )}
            overrides={data.environmentOverrides ?? {}}
            onChange={(environmentOverrides) => setData({ ...data, environmentOverrides })}
          />
          {duplicates.length > 0 && (
            <p role="status" className="notice">
              This Route and environment overrides are already saved in this project. Change the
              Route, overrides or project to save a separate link.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              title="Cancel (Esc)"
              aria-keyshortcuts="Escape"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="primary"
              title="Save (⌘ Enter / Ctrl Enter)"
              aria-keyshortcuts="Meta+Enter Control+Enter"
              disabled={busy}
              type="submit"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

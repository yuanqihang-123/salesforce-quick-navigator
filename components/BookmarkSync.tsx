import { useState } from 'react';
import type { SalesforceProject } from '../types';
import { useBookmarkSync } from '../hooks/useBookmarkSync';

export function BookmarkSync({
  popup = false,
  projectId,
  projects,
}: {
  popup?: boolean;
  projectId: string;
  projects: SalesforceProject[];
}) {
  const sync = useBookmarkSync();
  const [selectedProject, setSelectedProject] = useState<string>();
  const target = sync.state.enabled ? sync.state.projectId : (selectedProject ?? projectId);
  const validTarget = projects.some((project) => project.id === target) ? target : projectId;
  if (sync.loading) return null;
  if (popup && (sync.state.enabled || sync.state.dismissed) && !sync.error) return null;
  return (
    <section
      className={popup ? 'bookmark-prompt' : 'panel bookmark-settings'}
      aria-label="Salesforce bookmarks"
    >
      {popup ? <strong>Add your Salesforce bookmarks</strong> : <h2>Salesforce bookmarks</h2>}
      <p className="hint">
        Turn Salesforce bookmarks in your bookmarks bar and its folders into Quick Links. Sync runs
        locally and never changes browser bookmarks. Links open in the Org you choose.
      </p>
      {!popup && (
        <>
          <label className="preference-toggle">
            <input
              type="checkbox"
              checked={sync.state.enabled}
              disabled={sync.busy}
              onChange={(event) => {
                if (event.target.checked) void sync.enable(validTarget);
                else void sync.disable();
              }}
            />
            Enable bookmark sync
          </label>
          <p className="hint">
            Turning this off keeps imported Quick Links. Editing or deleting a Quick Link stops
            syncing that link.
          </p>
          {projects.length > 1 && (
            <label className="bookmark-project">
              Import into project
              <select
                value={validTarget}
                disabled={sync.busy || sync.state.enabled}
                onChange={(event) => setSelectedProject(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="hint">
            Supports Salesforce Org domains: lightning.force.com, my.salesforce.com and
            my.salesforce-setup.com, including Sandbox. Duplicate routes in the same project are
            combined.
          </p>
        </>
      )}
      {sync.error && (
        <p className="error" role="alert">
          {sync.error}
        </p>
      )}
      <div className="bookmark-actions">
        {popup && !sync.state.enabled && (
          <>
            <button
              className="primary"
              disabled={sync.busy}
              onClick={() => void sync.enable(projectId)}
            >
              {sync.busy ? 'Enabling…' : 'Enable bookmark links'}
            </button>
            <button disabled={sync.busy} onClick={() => void sync.dismiss()}>
              Not now
            </button>
          </>
        )}
        {sync.state.enabled && (
          <button disabled={sync.busy} onClick={() => void sync.refresh()}>
            {sync.busy ? 'Refreshing…' : 'Refresh now'}
          </button>
        )}
      </div>
      {!popup && sync.state.lastSyncedAt && (
        <p className="hint" role="status">
          Last synced: {new Date(sync.state.lastSyncedAt).toLocaleString()}. {sync.state.matched}{' '}
          Salesforce bookmarks matched
          {sync.state.skipped ? `; ${sync.state.skipped} invalid routes skipped` : ''}.
        </p>
      )}
    </section>
  );
}

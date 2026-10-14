import { useState } from 'react';
import type { SalesforceEnvironment, SalesforceProject } from '../../types';
import { environmentService } from '../../services/environmentService';
import { useOperation } from '../../hooks/useOperation';
import { EnvironmentForm } from './EnvironmentForm';
import { ConfirmDialog } from '../ConfirmDialog';
import { ErrorBanner } from '../ErrorBanner';
export function EnvironmentPanel({
  environments,
  projects,
  projectId,
  refresh,
}: {
  environments: SalesforceEnvironment[];
  projects: SalesforceProject[];
  projectId: string;
  refresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<SalesforceEnvironment | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SalesforceEnvironment | null>(null);
  const operation = useOperation(refresh);
  const recent = [...environments].sort((a, b) =>
    (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? ''),
  );
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Salesforce Orgs</h2>
        <button onClick={() => setEditing('new')}>+ Add Org</button>
      </div>
      <p className="hint">
        Visited Orgs are recorded automatically in Default. Move them to a project or add an Org
        manually.
      </p>
      <ErrorBanner error={operation.error} />
      {editing && (
        <EnvironmentForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          projectId={projectId}
          projects={projects}
          onCancel={() => setEditing(null)}
          onSave={async (environment) => {
            await environmentService.save(environment);
            setEditing(null);
            await refresh();
          }}
        />
      )}
      {!recent.length && <p className="hint">No saved Orgs in this project.</p>}
      <ul>
        {recent.map((env) => (
          <li className="entity-row" key={env.id}>
            <div>
              <strong>{env.name}</strong>
              <span className="hint">
                {env.orgDomain} · {env.isSandbox ? 'Sandbox' : 'Production'}
              </span>
              {env.lastVisitedAt && (
                <small>Last visited: {new Date(env.lastVisitedAt).toLocaleString()}</small>
              )}
            </div>
            <button onClick={() => setEditing(env)}>Edit</button>
            <button
              aria-label={`Delete Org ${env.name}`}
              className="delete"
              onClick={() => setDeleting(env)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {deleting && (
        <ConfirmDialog
          title="Delete saved Org?"
          message={`Remove “${deleting.name}” and its route overrides? Visiting this Org again will record it again.`}
          action="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await environmentService.delete(deleting.id);
            setDeleting(null);
            await refresh();
          }}
        />
      )}
    </section>
  );
}

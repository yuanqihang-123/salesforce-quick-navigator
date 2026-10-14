import { useState, type FormEvent } from 'react';
import { DEFAULT_PROJECT_ID, type SalesforceProject } from '../../types';
import { projectService } from '../../services/projectService';
import { useOperation } from '../../hooks/useOperation';
import { ConfirmDialog } from '../ConfirmDialog';
import { ErrorBanner } from '../ErrorBanner';
export function ProjectPanel({
  projects,
  refresh,
}: {
  projects: SalesforceProject[];
  refresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<SalesforceProject | 'new' | null>(null);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<SalesforceProject | null>(null);
  const operation = useOperation(refresh);
  async function save(event: FormEvent) {
    event.preventDefault();
    await operation.run(async () => {
      if (editing === 'new') await projectService.create(name);
      else if (editing) await projectService.rename(editing.id, name);
      setEditing(null);
    });
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Projects</h2>
        <button
          onClick={() => {
            setEditing('new');
            setName('');
          }}
        >
          + Add Project
        </button>
      </div>
      <ErrorBanner error={operation.error} />
      {editing && (
        <form className="inline-form" onSubmit={(event) => void save(event)}>
          <label>
            Project name
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="actions">
            <button type="button" disabled={operation.busy} onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="primary" disabled={operation.busy}>
              Save Project
            </button>
          </div>
        </form>
      )}
      <ul>
        {projects.map((project) => (
          <li className="entity-row" key={project.id}>
            <strong>{project.name}</strong>
            <button
              onClick={() => {
                setEditing(project);
                setName(project.name);
              }}
            >
              Rename
            </button>
            <button
              aria-label={`Delete project ${project.name}`}
              className="delete"
              disabled={project.id === DEFAULT_PROJECT_ID}
              onClick={() => setDeleting(project)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {deleting && (
        <ConfirmDialog
          title="Delete project?"
          message={`Delete “${deleting.name}”, all its links, saved Orgs and route overrides? Export a backup first if needed.`}
          action="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await projectService.delete(deleting.id);
            setDeleting(null);
            await refresh();
          }}
        />
      )}
    </section>
  );
}

import { useState, type FormEvent } from 'react';
import type { SalesforceEnvironment, SalesforceProject } from '../../types';
import { parseOrg } from '../../services/salesforceUrlResolver';
import { environmentOrg } from '../../services/environmentService';
export function EnvironmentForm({
  initial,
  projectId,
  projects,
  onSave,
  onCancel,
}: {
  initial?: SalesforceEnvironment;
  projectId: string;
  projects: SalesforceProject[];
  onSave: (environment: SalesforceEnvironment) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial ? `https://${environmentOrg(initial).hostname}/` : '');
  const [project, setProject] = useState(initial?.projectId ?? projectId);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const org = parseOrg(url);
      await onSave({
        id: initial?.id ?? crypto.randomUUID(),
        name,
        orgDomain: org.orgDomain,
        isSandbox: org.isSandbox,
        projectId: project,
        lastVisitedAt: initial?.lastVisitedAt,
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save Org.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="inline-form" onSubmit={(event) => void submit(event)}>
      <h3>{initial ? 'Edit Org' : 'Add Org'}</h3>
      <label>
        Name
        <input
          autoFocus
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Salesforce URL
        <input
          required
          type="url"
          placeholder="https://your-org.sandbox.lightning.force.com/"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <label>
        Project
        <select value={project} onChange={(event) => setProject(event.target.value)}>
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          Save Org
        </button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import {
  importExportService,
  parseBackup,
  type ImportMode,
} from '../../services/importExportService';
import { useOperation } from '../../hooks/useOperation';
import { ConfirmDialog } from '../ConfirmDialog';
import { ErrorBanner } from '../ErrorBanner';
export function DataManagement({
  refresh,
  loading,
}: {
  refresh: () => Promise<void>;
  loading: boolean;
}) {
  const [mode, setMode] = useState<ImportMode>('merge');
  const [replacement, setReplacement] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const operation = useOperation(refresh);
  async function importBackup(json: string, importMode: ImportMode) {
    const result = await importExportService.importJson(json, importMode);
    setNotice(`Imported ${result.imported} links. Skipped ${result.skipped} duplicate links.`);
    setReplacement(null);
    await refresh();
  }
  async function exportBackup() {
    const json = await importExportService.exportJson();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'salesforce-quick-navigator-backup.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="panel">
      <h2>Data Management</h2>
      <p className="hint">
        Back up links, projects, Orgs and route overrides. Version 1 backups are also supported.
      </p>
      <ErrorBanner error={operation.error} />
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <div className="data-actions">
        <button
          disabled={operation.busy || loading}
          onClick={() => void operation.run(exportBackup)}
        >
          Export JSON
        </button>
        <label>
          Import mode
          <select value={mode} onChange={(event) => setMode(event.target.value as ImportMode)}>
            <option value="merge">Merge · skip existing IDs</option>
            <option value="replace">Replace all data</option>
          </select>
        </label>
        <label className="file-button">
          Import JSON
          <input
            type="file"
            accept=".json,application/json"
            disabled={operation.busy || loading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              void operation.run(async () => {
                const json = await file.text();
                parseBackup(json);
                if (mode === 'replace') setReplacement(json);
                else await importBackup(json, 'merge');
              });
            }}
          />
        </label>
      </div>
      {replacement !== null && (
        <ConfirmDialog
          title="Replace all Quick Links?"
          message="This replaces all links, projects, saved Orgs and route overrides with the backup."
          action="Replace"
          onCancel={() => setReplacement(null)}
          onConfirm={() => importBackup(replacement, 'replace')}
        />
      )}
    </section>
  );
}

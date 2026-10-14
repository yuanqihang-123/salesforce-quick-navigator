import { useState } from 'react';
import { DEFAULT_PROJECT_ID } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { useLinkManager } from '../../hooks/useLinkManager';
import { usePendingDraft } from '../../hooks/usePendingDraft';
import { compareLinks } from '../../services/linkQuery';
import { AppHeader } from '../AppHeader';
import { ErrorBanner } from '../ErrorBanner';
import { ProjectSelect } from '../ProjectSelect';
import { LinkDialogs } from '../links/LinkDialogs';
import { QuickLinksPanel } from './QuickLinksPanel';
import { EnvironmentPanel } from './EnvironmentPanel';
import { ProjectPanel } from './ProjectPanel';
import { DataManagement } from './DataManagement';
import { storageService } from '../../services/storageService';
import { About } from './About';
import { BookmarkSync } from '../BookmarkSync';
export function SettingsApp() {
  const data = useSettings();
  const [selectedProject, setProject] = useState(DEFAULT_PROJECT_ID);
  const projectId = data.settings.projects.some((project) => project.id === selectedProject)
    ? selectedProject
    : DEFAULT_PROJECT_ID;
  const manager = useLinkManager(projectId, data.refresh);
  usePendingDraft(data.loading, manager.setForm, manager.setError);
  const links = data.settings.quickLinks
    .filter((link) => link.projectId === projectId)
    .sort(compareLinks);
  return (
    <main className="app settings">
      <AppHeader onError={manager.setError} />
      <ErrorBanner
        error={manager.error || data.error}
        onDismiss={() => {
          manager.setError('');
          data.setError('');
        }}
      />
      <section className="panel">
        <h2>Preferences</h2>
        <label className="preference-toggle">
          <input
            type="checkbox"
            checked={!!data.settings.favoritesEnabled}
            disabled={data.loading || manager.busy}
            onChange={(event) => {
              const enabled = event.target.checked;
              void manager.run(() =>
                storageService.mutate((settings) => {
                  settings.favoritesEnabled = enabled;
                }),
              );
            }}
          />
          Enable favorites
        </label>
        <p className="hint">
          Show favorite stars on links. Turning this off keeps your saved favorites and open counts.
        </p>
      </section>
      <ProjectSelect projects={data.settings.projects} value={projectId} onChange={setProject} />
      <BookmarkSync projectId={projectId} projects={data.settings.projects} />
      <QuickLinksPanel
        key={projectId}
        links={links}
        loading={data.loading}
        favoritesEnabled={data.settings.favoritesEnabled}
        actions={manager.actions}
        onAdd={() => void manager.add(false)}
      />
      <EnvironmentPanel
        key={projectId + ':orgs'}
        environments={data.settings.environments.filter((env) => env.projectId === projectId)}
        projects={data.settings.projects}
        projectId={projectId}
        refresh={data.refresh}
      />
      <ProjectPanel projects={data.settings.projects} refresh={data.refresh} />
      <DataManagement refresh={data.refresh} loading={data.loading} />
      <About />
      <LinkDialogs manager={manager} settings={data.settings} />
    </main>
  );
}

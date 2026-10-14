import { useState } from 'react';
import { DEFAULT_PROJECT_ID } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { useCurrentOrg } from '../../hooks/useCurrentOrg';
import { useLinkManager } from '../../hooks/useLinkManager';
import { usePendingDraft } from '../../hooks/usePendingDraft';
import { useLinkKeyboard } from '../../hooks/useLinkKeyboard';
import { compareLinks, navigationLinks } from '../../services/linkQuery';
import { navigationService } from '../../services/navigationService';
import { AppHeader } from '../AppHeader';
import { ErrorBanner } from '../ErrorBanner';
import { ProjectSelect } from '../ProjectSelect';
import { QuickLinkList } from '../links/QuickLinkList';
import { LinkDialogs } from '../links/LinkDialogs';
import { orgChoices } from '../../services/orgChoices';
import { OrgOpenDialog } from './OrgOpenDialog';
import { PopupSearch } from './PopupSearch';
import type { QuickLink } from '../../types';
import { BookmarkSync } from '../BookmarkSync';
export function PopupApp() {
  const data = useSettings();
  const current = useCurrentOrg();
  const [selectedProject, setProject] = useState(DEFAULT_PROJECT_ID);
  const [pendingOpen, setPendingOpen] = useState<
    { kind: 'link'; link: QuickLink } | { kind: 'current-page' } | null
  >(null);
  const [query, setQuery] = useState('');
  const projectId = data.settings.projects.some((item) => item.id === selectedProject)
    ? selectedProject
    : DEFAULT_PROJECT_ID;
  const environments = data.settings.environments.filter((env) => env.projectId === projectId);
  const choices = orgChoices(environments, current.org);
  const currentPageChoices = orgChoices(
    environments.filter(
      (env) => env.orgDomain !== current.org?.orgDomain || env.isSandbox !== current.org?.isSandbox,
    ),
  );
  const dialogChoices = pendingOpen?.kind === 'current-page' ? currentPageChoices : choices;
  const currentTarget = current.org
    ? (environments.find(
        (env) =>
          env.orgDomain === current.org!.orgDomain && env.isSandbox === current.org!.isSandbox,
      )?.id ?? '')
    : '';
  const manager = useLinkManager(projectId, data.refresh);
  usePendingDraft(data.loading, manager.setForm, manager.setError);
  const links = data.settings.quickLinks
    .filter((link) => link.projectId === projectId)
    .sort(compareLinks);
  const canOpen = choices.length > 0 && current.ready;
  const canOpenCurrentPage =
    currentPageChoices.length > 0 && current.ready && current.supportedRoute;
  const openLink = (link: QuickLink) => {
    setPendingOpen({ kind: 'link', link });
  };
  const keyboard = useLinkKeyboard({
    links: canOpen ? navigationLinks(links, query, data.settings.favoritesEnabled) : [],
    query,
    projectId,
    enabled: current.ready && !data.loading && !pendingOpen && !manager.form && !manager.deleting,
    canOpenCurrentPage,
    busy: manager.busy,
    onOpen: openLink,
  });
  const error = manager.error || data.error || current.error;
  return (
    <main className={`app popup${manager.form ? ' form-open' : ''}`}>
      <AppHeader popup onError={manager.setError} />
      {data.settings.projects.length > 1 && (
        <ProjectSelect
          projects={data.settings.projects}
          value={projectId}
          onChange={(id) => {
            setProject(id);
            setPendingOpen(null);
            setQuery('');
          }}
        />
      )}
      <ErrorBanner
        error={error}
        onDismiss={() => {
          manager.setError('');
          data.setError('');
        }}
      />
      <section className="links-section">
        <div className="section-heading popup-actions">
          <button
            ref={keyboard.currentPageRef}
            disabled={!canOpenCurrentPage || data.loading || manager.busy}
            aria-haspopup="dialog"
            title="Choose an Org to open the current page (↑ from search)"
            onFocus={keyboard.onCurrentPageFocus}
            onKeyDown={keyboard.onCurrentPageKeyDown}
            onClick={() => setPendingOpen({ kind: 'current-page' })}
          >
            Open current page ↗
          </button>
          <button
            className="primary"
            disabled={manager.busy || data.loading}
            title="Save the current page or add another link"
            onClick={() => void manager.add(true)}
          >
            + Add Link
          </button>
        </div>
        <PopupSearch
          inputRef={keyboard.searchRef}
          query={query}
          onChange={setQuery}
          activeId={keyboard.activeId}
          onKeyDown={keyboard.onKeyDown}
          canOpenCurrentPage={canOpenCurrentPage && !data.loading && !manager.busy}
        />
        <QuickLinkList
          id="popup-link-results"
          activeId={keyboard.activeId}
          links={links}
          query={query}
          loading={data.loading}
          navigation
          favoritesEnabled={data.settings.favoritesEnabled}
          canOpen={canOpen}
          actions={{ ...manager.actions, onOpen: openLink }}
        />
      </section>
      <BookmarkSync popup projectId={projectId} projects={data.settings.projects} />
      {pendingOpen && (
        <OrgOpenDialog
          choices={dialogChoices}
          defaultTarget={
            dialogChoices.find((choice) => choice.id === currentTarget)?.id ??
            dialogChoices[0]?.id ??
            ''
          }
          onCancel={() => setPendingOpen(null)}
          onOpen={async (targetId) => {
            if (pendingOpen.kind === 'current-page')
              await navigationService.openCurrentPage(projectId, targetId);
            else await navigationService.requestOpenLink(pendingOpen.link, projectId, targetId);
            setPendingOpen(null);
          }}
        />
      )}
      <LinkDialogs manager={manager} settings={data.settings} />
    </main>
  );
}

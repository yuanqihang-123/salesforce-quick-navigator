import type { AppSettings } from '../../types';
import type { useLinkManager } from '../../hooks/useLinkManager';
import { QuickLinkForm } from '../QuickLinkForm';
import { ConfirmDialog } from '../ConfirmDialog';
export function LinkDialogs({
  manager,
  settings,
}: {
  manager: ReturnType<typeof useLinkManager>;
  settings: AppSettings;
}) {
  return (
    <>
      {manager.form && (
        <QuickLinkForm
          initial={manager.form}
          favoritesEnabled={settings.favoritesEnabled}
          links={settings.quickLinks}
          projects={settings.projects}
          environments={settings.environments}
          onCancel={() => manager.setForm(null)}
          onSave={manager.save}
        />
      )}
      {manager.deleting && (
        <ConfirmDialog
          title="Delete Quick Link?"
          message={`Are you sure you want to delete “${manager.deleting.name}”?`}
          action="Delete"
          onCancel={() => manager.setDeleting(null)}
          onConfirm={manager.remove}
        />
      )}
    </>
  );
}

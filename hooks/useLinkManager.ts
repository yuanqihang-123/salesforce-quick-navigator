import { useState } from 'react';
import type { LinkInput, QuickLink } from '../types';
import { quickLinkService } from '../services/quickLinkService';
import { EMPTY_LINK_INPUT as emptyInput } from '../types';
import { tabService } from '../services/tabService';
import { useOperation } from './useOperation';
export function useLinkManager(projectId: string, refresh: () => Promise<void>) {
  const [form, setForm] = useState<(LinkInput & { id?: string }) | null>(null);
  const [deleting, setDeleting] = useState<QuickLink | null>(null);
  const operation = useOperation(refresh);
  async function add(fromCurrentPage: boolean) {
    if (!fromCurrentPage) {
      setForm({ ...emptyInput, projectId });
      return;
    }
    await operation.run(async () => {
      let input = emptyInput;
      try {
        input = await tabService.currentPage();
      } catch {
        /* Blank form still supports manual entry. */
      }
      setForm({ ...input, projectId });
    });
  }
  async function save(input: LinkInput) {
    if (form?.id) await quickLinkService.update(form.id, input);
    else await quickLinkService.create(input);
    setForm(null);
    await refresh();
  }
  async function remove() {
    if (!deleting) return;
    await quickLinkService.delete(deleting.id);
    setDeleting(null);
    await refresh();
  }
  const actions = {
    busy: operation.busy,
    onEdit: setForm,
    onDelete: setDeleting,
    onFavorite: (id: string) => {
      void operation.run(() => quickLinkService.toggleFavorite(id));
    },
    onMove: (id: string, direction: -1 | 1) => {
      void operation.run(() => quickLinkService.move(id, direction));
    },
  };
  return { ...operation, form, deleting, setForm, setDeleting, add, save, remove, actions };
}

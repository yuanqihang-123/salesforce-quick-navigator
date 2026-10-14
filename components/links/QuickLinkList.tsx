import { useEffect, useRef } from 'react';
import type { QuickLink } from '../../types';
import { navigationLinks, searchLinks } from '../../services/linkQuery';
import { QuickLinkItem, type LinkActions } from './QuickLinkItem';
export function QuickLinkList({
  links,
  query,
  loading,
  navigation = false,
  favoritesEnabled = false,
  canOpen = false,
  actions,
  activeId,
  id,
}: {
  links: QuickLink[];
  query: string;
  loading: boolean;
  navigation?: boolean;
  favoritesEnabled?: boolean;
  canOpen?: boolean;
  actions: LinkActions;
  activeId?: string;
  id?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = container.current;
    const row = list?.querySelector<HTMLElement>('[data-active="true"]');
    if (!list || !row) return;
    const bounds = list.getBoundingClientRect();
    const selected = row.getBoundingClientRect();
    if (selected.top < bounds.top) list.scrollTop += selected.top - bounds.top;
    else if (selected.bottom > bounds.bottom) list.scrollTop += selected.bottom - bounds.bottom;
  }, [activeId]);
  const visible = navigation
    ? navigationLinks(links, query, favoritesEnabled)
    : searchLinks(links, query);
  function row(link: QuickLink) {
    const index = links.findIndex((item) => item.id === link.id);
    return (
      <QuickLinkItem
        key={link.id}
        link={link}
        actions={actions}
        navigation={navigation}
        favoritesEnabled={favoritesEnabled}
        canOpen={canOpen}
        active={link.id === activeId}
        canMoveUp={!query.trim() && index > 0}
        canMoveDown={!query.trim() && index < links.length - 1}
      />
    );
  }
  return (
    <div ref={container} id={id} className="link-list" aria-busy={loading}>
      {loading ? (
        <p className="empty" role="status">
          Loading links…
        </p>
      ) : !visible.length ? (
        <div className="empty">
          <strong>{links.length ? 'No matching links' : 'Your shortcuts start here'}</strong>
          <p>
            {links.length
              ? 'Try another search.'
              : 'Add a link to save the current page or another Salesforce route.'}
          </p>
        </div>
      ) : (
        <ul>{visible.map(row)}</ul>
      )}
    </div>
  );
}

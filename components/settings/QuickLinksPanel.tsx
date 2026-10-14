import { useState } from 'react';
import type { QuickLink } from '../../types';
import type { LinkActions } from '../links/QuickLinkItem';
import { QuickLinkList } from '../links/QuickLinkList';
export function QuickLinksPanel({
  links,
  loading,
  favoritesEnabled,
  actions,
  onAdd,
}: {
  links: QuickLink[];
  loading: boolean;
  favoritesEnabled?: boolean;
  actions: LinkActions;
  onAdd: () => void;
}) {
  const [query, setQuery] = useState('');
  return (
    <section className="links-section">
      <div className="section-heading">
        <h2>
          Quick Links <span className="count">{links.length}</span>
        </h2>
        <button className="primary" disabled={actions.busy || loading} onClick={onAdd}>
          + Add Link
        </button>
      </div>
      <label className="search">
        <span className="sr-only">Search links</span>
        <input
          type="search"
          placeholder="Search links…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <QuickLinkList
        favoritesEnabled={favoritesEnabled}
        links={links}
        query={query}
        loading={loading}
        actions={actions}
      />
    </section>
  );
}

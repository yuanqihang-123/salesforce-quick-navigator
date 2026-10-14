import type { QuickLink } from '../../types';
export const linkButtonId = (id: string) => `quick-link-${encodeURIComponent(id)}`;
export interface LinkActions {
  busy: boolean;
  onEdit: (link: QuickLink) => void;
  onDelete: (link: QuickLink) => void;
  onFavorite: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onOpen?: (link: QuickLink) => void;
}
export function QuickLinkItem({
  link,
  actions,
  navigation,
  favoritesEnabled,
  canOpen,
  canMoveUp,
  canMoveDown,
  active = false,
}: {
  link: QuickLink;
  actions: LinkActions;
  navigation: boolean;
  favoritesEnabled: boolean;
  canOpen: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  active?: boolean;
}) {
  const openCount = link.openCount ?? 0;
  const countLabel = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(openCount);
  return (
    <li className={`link-row${active ? ' keyboard-active' : ''}`} data-active={active || undefined}>
      {favoritesEnabled ? (
        <button
          className={`star ${link.favorite ? 'selected' : ''}${navigation ? ' star-count' : ''}`}
          title={`${link.favorite ? 'Unfavorite' : 'Favorite'} · Opened ${openCount} times`}
          aria-description={`Opened ${openCount} times`}
          disabled={actions.busy}
          aria-label={`${link.favorite ? 'Unfavorite' : 'Favorite'} ${link.name}`}
          onClick={() => actions.onFavorite(link.id)}
        >
          <span aria-hidden="true">{link.favorite ? '★' : '☆'}</span>
          {navigation && (
            <span className="open-count" aria-hidden="true">
              {countLabel}
            </span>
          )}
        </button>
      ) : navigation ? (
        <span
          className="open-count standalone-count"
          title={`Opened ${openCount} times`}
          aria-label={`Opened ${openCount} times`}
        >
          {countLabel}
        </span>
      ) : null}
      {navigation ? (
        <button
          id={linkButtonId(link.id)}
          className="link-name"
          disabled={!canOpen || actions.busy}
          title={link.route}
          onClick={() => actions.onOpen?.(link)}
        >
          <span>{link.name}</span>
        </button>
      ) : (
        <div className="link-detail">
          <strong>{link.name}</strong>
          <code>{link.route}</code>
          <span className="hint">
            {link.category || 'Others'}
            {link.description ? ` · ${link.description}` : ''}
          </span>
        </div>
      )}
      {!navigation && (
        <div className="row-actions">
          <button
            disabled={actions.busy || !canMoveUp}
            aria-label={`Move ${link.name} up`}
            onClick={() => actions.onMove(link.id, -1)}
          >
            ↑
          </button>
          <button
            disabled={actions.busy || !canMoveDown}
            aria-label={`Move ${link.name} down`}
            onClick={() => actions.onMove(link.id, 1)}
          >
            ↓
          </button>
        </div>
      )}
      <button
        className={`compact${navigation ? ' icon-action' : ''}`}
        disabled={actions.busy}
        aria-label={`Edit ${link.name}`}
        title={`Edit ${link.name}`}
        onClick={() => actions.onEdit(link)}
      >
        {navigation ? (
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m16 3 5 5-13 13-6 1 1-6Z" />
            <path d="m14 5 5 5" />
          </svg>
        ) : (
          'Edit'
        )}
      </button>
      <button
        className={`compact delete${navigation ? ' icon-action' : ''}`}
        disabled={actions.busy}
        aria-label={`Delete ${link.name}`}
        title={`Delete ${link.name}`}
        onClick={() => actions.onDelete(link)}
      >
        {navigation ? (
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
          </svg>
        ) : (
          'Delete'
        )}
      </button>
    </li>
  );
}

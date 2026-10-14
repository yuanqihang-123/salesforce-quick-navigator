import type { LinkInput, QuickLink, SalesforceProject } from '../../types';
import { extractRoute } from '../../services/salesforceUrlResolver';
export function LinkFields({
  data,
  favoritesEnabled,
  links,
  projects,
  onChange,
  onError,
}: {
  data: LinkInput;
  favoritesEnabled: boolean;
  links: QuickLink[];
  projects: SalesforceProject[];
  onChange: (changes: Partial<LinkInput>) => void;
  onError: (message: string) => void;
}) {
  return (
    <>
      {projects.length > 1 && (
        <label>
          Project
          <select
            value={data.projectId ?? 'default'}
            onChange={(event) =>
              onChange({ projectId: event.target.value, environmentOverrides: {} })
            }
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Name *
        <input
          required
          maxLength={100}
          value={data.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <label>
        URL / Route *
        <textarea
          required
          rows={3}
          maxLength={4096}
          value={data.route}
          placeholder="/lightning/o/Account/list"
          onChange={(event) => onChange({ route: event.target.value })}
          onBlur={() => {
            try {
              onChange({ route: extractRoute(data.route, data.routeDomain) });
              onError('');
            } catch (error) {
              if (data.route) onError(error instanceof Error ? error.message : 'Invalid Route.');
            }
          }}
        />
      </label>
      {data.routeDomain && (
        <label>
          Salesforce domain
          <select
            value={data.routeDomain}
            onChange={(event) =>
              onChange({ routeDomain: event.target.value as LinkInput['routeDomain'] })
            }
          >
            <option value="lightning">Lightning</option>
            <option value="setup">Setup</option>
            <option value="my-domain">My Domain / Classic</option>
          </select>
        </label>
      )}
      <p className="hint">
        Edit the name and route to save any page. Paste a Salesforce URL to extract its route.
      </p>
      <label>
        Category
        <input
          list="categories"
          value={data.category}
          onChange={(event) => onChange({ category: event.target.value })}
        />
      </label>
      <datalist id="categories">
        {[...new Set(links.map((link) => link.category).filter(Boolean))].sort().map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <label>
        Description
        <textarea
          rows={2}
          maxLength={500}
          value={data.description ?? ''}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
      {favoritesEnabled && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={data.favorite}
            onChange={(event) => onChange({ favorite: event.target.checked })}
          />{' '}
          Add to Favorites
        </label>
      )}
    </>
  );
}

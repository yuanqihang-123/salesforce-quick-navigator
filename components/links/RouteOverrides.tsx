import type { SalesforceEnvironment } from '../../types';
export function RouteOverrides({
  environments,
  overrides,
  onChange,
}: {
  environments: SalesforceEnvironment[];
  overrides: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}) {
  if (!environments.length) return null;
  return (
    <details className="route-overrides">
      <summary>Environment routes ({Object.keys(overrides).length})</summary>
      <p className="hint">
        Optional: use a different route or Record ID in a specific Org. Blank uses the default
        route.
      </p>
      {environments.map((env) => (
        <label key={env.id}>
          {env.name} route
          <textarea
            rows={2}
            maxLength={4096}
            value={Object.hasOwn(overrides, env.id) ? overrides[env.id] : ''}
            placeholder="Use default route"
            onChange={(event) => {
              const updated = { ...overrides };
              if (event.target.value) updated[env.id] = event.target.value;
              else delete updated[env.id];
              onChange(updated);
            }}
          />
        </label>
      ))}
    </details>
  );
}

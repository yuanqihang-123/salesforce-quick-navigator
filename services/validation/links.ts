import type { LinkInput, QuickLink } from '../../types';
import { extractRoute } from '../salesforceUrlResolver';
import { record, id, name, timestamp } from './primitives';
export function validateInput(value: unknown): LinkInput {
  const data = record(value);
  if (typeof data.route !== 'string' || data.route.length > 4096)
    throw new Error('Route must be at most 4096 characters.');
  if (typeof data.category !== 'string') throw new Error('Category must be text.');
  if (
    data.description !== undefined &&
    (typeof data.description !== 'string' || data.description.length > 500)
  )
    throw new Error('Description must be at most 500 characters.');
  if (typeof data.favorite !== 'boolean') throw new Error('Favorite must be a boolean.');
  if (
    data.routeDomain !== undefined &&
    !['lightning', 'setup', 'my-domain'].includes(data.routeDomain as string)
  )
    throw new Error('Invalid route domain.');
  const input: LinkInput = {
    name: name(data.name),
    route: extractRoute(data.route, data.routeDomain as LinkInput['routeDomain']),
    category: data.category.trim(),
    description: typeof data.description === 'string' ? data.description.trim() : '',
    favorite: data.favorite,
  };
  if (data.routeDomain !== undefined)
    input.routeDomain = data.routeDomain as LinkInput['routeDomain'];
  if (data.projectId !== undefined) input.projectId = id(data.projectId);
  if (data.environmentOverrides !== undefined) {
    const overrides = record(data.environmentOverrides);
    input.environmentOverrides = Object.fromEntries(
      Object.entries(overrides).map(([key, route]) => {
        id(key);
        if (typeof route !== 'string') throw new Error('Override route must be text.');
        return [key, extractRoute(route, input.routeDomain)];
      }),
    );
  }
  return input;
}
export function validateLink(value: unknown): QuickLink {
  const data = record(value);
  if (
    typeof data.sortOrder !== 'number' ||
    !Number.isSafeInteger(data.sortOrder) ||
    data.sortOrder < 0
  )
    throw new Error('Sort Order must be a nonnegative integer.');
  const openCount = data.openCount ?? 0;
  if (typeof openCount !== 'number' || !Number.isSafeInteger(openCount) || openCount < 0)
    throw new Error('Open count must be a nonnegative integer.');
  return {
    ...validateInput(data),
    openCount,
    id: id(data.id),
    sortOrder: data.sortOrder,
    createdAt: timestamp(data.createdAt),
    updatedAt: timestamp(data.updatedAt),
  };
}

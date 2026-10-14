export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a JSON object.');
  return value as Record<string, unknown>;
}
export function id(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200)
    throw new Error('Invalid ID.');
  return value;
}
export function name(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 100)
    throw new Error('Name is required and must be at most 100 characters.');
  return value.trim();
}
export function timestamp(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19)
  ) {
    throw new Error('Invalid UTC timestamp.');
  }
  return value;
}
export function collection<T extends { id: string }>(
  value: unknown,
  label: string,
  validate: (item: unknown) => T,
): T[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  const errors: string[] = [];
  const ids = new Set<string>();
  const result: T[] = [];
  value.forEach((item: unknown, index) => {
    try {
      const entry = validate(item);
      if (ids.has(entry.id)) throw new Error('Duplicate ID.');
      ids.add(entry.id);
      result.push(entry);
    } catch (error) {
      errors.push(
        `${label} ${index + 1}: ${error instanceof Error ? error.message : 'Invalid data.'}`,
      );
    }
  });
  if (errors.length) throw new Error(errors.join('\n'));
  return result;
}

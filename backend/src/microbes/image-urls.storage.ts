import type { ValueTransformer } from 'typeorm';

/**
 * Store image URL lists as JSON in a text column.
 * `from` also repairs legacy TypeORM `simple-array` rows (comma-joined URLs) by
 * splitting only before the next `http(s)://`.
 */
function fromDb(value: string | null): string[] {
  if (value == null || value === '') return [];
  const t = value.trim();
  if (t.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(t);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
      }
      return [];
    } catch {
      return [];
    }
  }
  return t
    .split(/,(?=https?:\/\/)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function toDb(value: string[] | null | undefined): string {
  return JSON.stringify(value ?? []);
}

export const imageUrlsJsonTransformer: ValueTransformer = {
  to: toDb,
  from: fromDb,
};

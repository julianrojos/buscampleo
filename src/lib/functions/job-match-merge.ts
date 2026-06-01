import { normalizeSearchText } from '../job-criteria';

function canonicalKey(value: string): string {
  return normalizeSearchText(value).trim();
}

export function mergeUniqueStrings(
  existing: readonly string[] | undefined,
  incoming: readonly string[],
): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const value of [...(existing ?? []), ...incoming]) {
    const text = value.trim();
    if (!text) {
      continue;
    }

    const key = canonicalKey(text);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(text);
  }

  return merged;
}

export function preferExistingText(
  existing: string | null | undefined,
  incoming: string,
): string {
  return existing?.trim() ? existing.trim() : incoming;
}

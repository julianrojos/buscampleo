function randomSegment(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

export function createRecordId(prefix: string): string {
  return `${prefix}-${randomSegment()}`;
}

const MEMORY_STORE = new Map<string, string>();

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function readStoredValue<T>(key: string, fallback: T): T {
  const storage = getStorage();
  const raw = storage?.getItem(key) ?? MEMORY_STORE.get(key) ?? null;

  if (!raw) {
    return cloneValue(fallback);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return cloneValue(fallback);
  }
}

export function writeStoredValue<T>(key: string, value: T): T {
  const raw = JSON.stringify(value);
  const storage = getStorage();

  if (storage) {
    storage.setItem(key, raw);
  } else {
    MEMORY_STORE.set(key, raw);
  }

  return value;
}

export function updateStoredValue<T>(key: string, fallback: T, updater: (value: T) => T): T {
  const nextValue = updater(readStoredValue(key, fallback));
  return writeStoredValue(key, nextValue);
}

// In-memory service-layer cache.
//
// IMPORTANT: Cloudflare Workers may run in multiple isolates simultaneously.
// This cache is local to a single isolate — do NOT use it for data that must
// be consistent across all instances. It is suitable for read-heavy, eventually
// consistent data (e.g., product lists, category trees).
//
// Cache sits in the SERVICE layer — never in controllers or repositories.
// Key pattern: "resource:id" | "resource:list:<hash>"
// Always invalidate on mutations (create, update, delete).
// Always set a TTL — never cache indefinitely.

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Removes all entries whose key starts with the given prefix. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();

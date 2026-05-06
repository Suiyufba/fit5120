export interface Cache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export class InMemoryCache implements Cache {
  private ttlMs: number;
  private store: Map<string, { value: unknown; expiresAt: number }>;

  constructor(ttlSeconds = 90) {
    this.ttlMs = ttlSeconds * 1000;
    this.store = new Map();
  }

  async get(key: string): Promise<unknown> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  timestamp: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRatio: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  enableStats?: boolean;
}

export class CacheService<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private stats: CacheStats;
  private readonly ttl: number;
  private readonly maxSize: number;
  private readonly enableStats: boolean;
  private pendingFetches: Map<string, Promise<T>> = new Map();
  
  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
    this.enableStats = options.enableStats ?? true;
    
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRatio: 0
    };
  }
  
  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.enableStats) {
        this.stats.misses++;
        this.updateHitRatio();
      }
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.enableStats) {
        this.stats.misses++;
        this.stats.size = this.cache.size;
        this.updateHitRatio();
      }
      return null;
    }
    
    if (this.enableStats) {
      this.stats.hits++;
      this.updateHitRatio();
    }
    
    return entry.value;
  }
  
  /**
   * Set item in cache with optional custom TTL
   */
  set(key: string, value: T, ttl?: number): void {
    // Check size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest entry (FIFO)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    const expiresAt = Date.now() + (ttl || this.ttl);
    this.cache.set(key, {
      value,
      expiresAt,
      timestamp: Date.now()
    });
    
    if (this.enableStats) {
      this.stats.size = this.cache.size;
    }
  }
  
  /**
   * Get cached value or fetch with deduplication
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Check if fetch is already in progress
    const pending = this.pendingFetches.get(key);
    if (pending) {
      return pending;
    }
    
    // Start new fetch
    const fetchPromise = fetcher()
      .then(result => {
        this.set(key, result, ttl);
        this.pendingFetches.delete(key);
        return result;
      })
      .catch(error => {
        this.pendingFetches.delete(key);
        throw error;
      });
    
    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }
  
  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (this.enableStats && deleted) {
      this.stats.size = this.cache.size;
    }
    return deleted;
  }
  
  /**
   * Invalidate entries matching pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (this.enableStats) {
      this.stats.size = this.cache.size;
    }
    
    return keysToDelete.length;
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingFetches.clear();
    
    if (this.enableStats) {
      this.stats.size = 0;
    }
  }
  
  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      size: this.cache.size,
      hitRatio: 0
    };
  }
  
  /**
   * Update hit ratio
   */
  private updateHitRatio(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total === 0 ? 0 : this.stats.hits / total;
  }
  
  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    if (this.enableStats && cleaned > 0) {
      this.stats.size = this.cache.size;
    }
    
    return cleaned;
  }
  
  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Check if key exists in cache (regardless of expiration)
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }
}

// Cache invalidation helpers
export class CacheInvalidator {
  /**
   * Get keys to invalidate on create
   */
  static onCreateKeys(entityType: string): string[] {
    return [
      `${entityType}:list`,
      `${entityType}:list:*`,
      `${entityType}:count`,
      `${entityType}:count:*`
    ];
  }
  
  /**
   * Get keys to invalidate on update
   */
  static onUpdateKeys(entityType: string, id: string): string[] {
    return [
      `${entityType}:list`,
      `${entityType}:list:*`,
      `${entityType}:detail:${id}`,
      `${entityType}:related:${id}`
    ];
  }
  
  /**
   * Get keys to invalidate on delete
   */
  static onDeleteKeys(entityType: string, id: string): string[] {
    return [
      `${entityType}:list`,
      `${entityType}:list:*`,
      `${entityType}:detail:${id}`,
      `${entityType}:count`,
      `${entityType}:count:*`,
      `${entityType}:related:*`
    ];
  }
}

// Create global cache instance for ingredients
export const ingredientCache = new CacheService({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  enableStats: true
});

// Export factory function for creating new cache instances
export function createCache<T>(options?: CacheOptions): CacheService<T> {
  return new CacheService<T>(options);
}
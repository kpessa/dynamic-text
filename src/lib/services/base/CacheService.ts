/**
 * Cache Service - Provides in-memory and localStorage caching with TTL
 * Optimizes Firebase reads and provides offline capabilities
 */

import { FirebaseTimestamp } from '../../types';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

export class CacheService {
  private memoryCache = new Map<string, CacheItem<any>>();
  private defaultTTL: number;
  private maxMemoryItems: number;
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  private storagePrefix = 'firebase-cache:';

  constructor(defaultTTL = 5 * 60 * 1000, maxMemoryItems = 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
    this.maxMemoryItems = maxMemoryItems;
    
    // Clean up expired items on startup
    this.cleanup();
    
    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 60 * 1000); // Every minute
  }

  /**
   * Get item from cache with fallback to fetcher function
   */
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl?: number,
    useLocalStorage = true
  ): Promise<T> {
    const cacheKey = this.normalizeKey(key);
    const effectiveTTL = ttl || this.defaultTTL;
    
    // Try memory cache first
    const memoryItem = this.memoryCache.get(cacheKey);
    if (memoryItem && this.isValidItem(memoryItem)) {
      this.stats.hits++;
      return memoryItem.data;
    }
    
    // Try localStorage if enabled
    if (useLocalStorage) {
      const storageItem = this.getFromStorage<T>(cacheKey);
      if (storageItem && this.isValidItem(storageItem)) {
        // Promote to memory cache
        this.setMemoryCache(cacheKey, storageItem.data, effectiveTTL);
        this.stats.hits++;
        return storageItem.data;
      }
    }
    
    // Cache miss - fetch data
    this.stats.misses++;
    const data = await fetcher();
    
    // Store in both caches
    this.set(cacheKey, data, effectiveTTL, useLocalStorage);
    
    return data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl?: number, useLocalStorage = true): void {
    const cacheKey = this.normalizeKey(key);
    const effectiveTTL = ttl || this.defaultTTL;
    
    this.setMemoryCache(cacheKey, data, effectiveTTL);
    
    if (useLocalStorage) {
      this.setStorage(cacheKey, data, effectiveTTL);
    }
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    const cacheKey = this.normalizeKey(key);
    
    // Remove from memory cache
    this.memoryCache.delete(cacheKey);
    
    // Remove from localStorage
    try {
      localStorage.removeItem(this.storagePrefix + cacheKey);
    } catch (error) {
      console.warn('Error removing item from localStorage:', error);
    }
  }

  /**
   * Invalidate multiple cache entries by pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0;
    
    // Invalidate memory cache
    for (const key of this.memoryCache.keys()) {
      if (pattern.test(key)) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }
    
    // Invalidate localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          const cacheKey = key.substring(this.storagePrefix.length);
          if (pattern.test(cacheKey)) {
            localStorage.removeItem(key);
            invalidated++;
          }
        }
      }
    } catch (error) {
      console.warn('Error invalidating localStorage patterns:', error);
    }
    
    return invalidated;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Error clearing localStorage cache:', error);
    }
    
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.memoryCache.size
    };
  }

  /**
   * Get cache hit ratio
   */
  getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  private normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  }

  private setMemoryCache<T>(key: string, data: T, ttl: number): void {
    // Evict oldest items if at capacity
    if (this.memoryCache.size >= this.maxMemoryItems) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private setStorage<T>(key: string, data: T, ttl: number): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(this.storagePrefix + key, JSON.stringify(item));
    } catch (error) {
      // Storage quota exceeded or not available
      console.warn('Unable to store in localStorage:', error);
    }
  }

  private getFromStorage<T>(key: string): CacheItem<T> | null {
    try {
      const item = localStorage.getItem(this.storagePrefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
      return null;
    }
  }

  private isValidItem<T>(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp < item.ttl;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    // Clean memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp >= item.ttl) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    // Clean localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          const item = this.getFromStorage(key.substring(this.storagePrefix.length));
          if (item && !this.isValidItem(item)) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      cleaned += keysToRemove.length;
    } catch (error) {
      console.warn('Error during cache cleanup:', error);
    }
    
    if (cleaned > 0) {
      console.debug(`Cache cleanup: removed ${cleaned} expired items`);
    }
  }
}

// Global cache instance
export const cacheService = new CacheService();
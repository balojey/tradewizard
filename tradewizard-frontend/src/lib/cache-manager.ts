/**
 * Enhanced Cache Manager for Performance Optimization
 * Implements Requirements 10.2, 10.4
 * 
 * Features:
 * - 60-second cache revalidation for market data
 * - Memory-efficient LRU cache with size limits
 * - Background refresh for frequently accessed data
 * - Cache invalidation strategies
 * - Performance metrics tracking
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  accessCount: number;
  lastAccessed: number;
  size?: number; // Estimated size in bytes
}

export interface CacheConfig {
  defaultTtl: number; // Default TTL in milliseconds
  maxSize: number; // Maximum cache size in MB
  maxEntries: number; // Maximum number of entries
  backgroundRefreshThreshold: number; // Refresh when TTL < this percentage
  enableMetrics: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
  averageAccessTime: number;
}

/**
 * LRU Cache with TTL and background refresh capabilities
 */
export class EnhancedCacheManager<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private refreshCallbacks = new Map<string, () => Promise<T>>();
  private refreshPromises = new Map<string, Promise<T>>();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTtl: 60000, // 60 seconds
      maxSize: 50, // 50MB
      maxEntries: 1000,
      backgroundRefreshThreshold: 0.2, // Refresh when 20% of TTL remaining
      enableMetrics: true,
      ...config,
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
    };

    // Periodic cleanup
    setInterval(() => this.cleanup(), 30000); // Every 30 seconds
  }

  /**
   * Get item from cache with automatic background refresh
   */
  async get(key: string, refreshCallback?: () => Promise<T>): Promise<T | null> {
    const startTime = performance.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.updateMetrics('miss', performance.now() - startTime);
      return null;
    }

    const now = Date.now();

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = now;
    this.updateAccessOrder(key);

    // Check if expired
    if (now > entry.expiry) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.updateMetrics('miss', performance.now() - startTime);
      return null;
    }

    // Background refresh if needed
    if (refreshCallback && this.shouldBackgroundRefresh(entry)) {
      this.backgroundRefresh(key, refreshCallback);
    }

    this.updateMetrics('hit', performance.now() - startTime);
    return entry.data;
  }

  /**
   * Set item in cache with optional TTL
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const actualTtl = ttl || this.config.defaultTtl;
    const estimatedSize = this.estimateSize(data);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiry: now + actualTtl,
      accessCount: 1,
      lastAccessed: now,
      size: estimatedSize,
    };

    // Check if we need to evict entries
    this.ensureCapacity(estimatedSize);

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.updateCacheSize();
  }

  /**
   * Get with automatic refresh - combines get and set operations
   */
  async getOrRefresh(
    key: string, 
    refreshCallback: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = await this.get(key, refreshCallback);
    
    if (cached !== null) {
      return cached;
    }

    // Not in cache or expired, fetch fresh data
    const data = await this.fetchWithDeduplication(key, refreshCallback);
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Register a refresh callback for automatic background updates
   */
  registerRefreshCallback(key: string, callback: () => Promise<T>): void {
    this.refreshCallbacks.set(key, callback);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
      this.updateCacheSize();
    }
    return deleted;
  }

  /**
   * Invalidate entries matching pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.refreshCallbacks.clear();
    this.refreshPromises.clear();
    this.updateCacheSize();
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache entries for debugging
   */
  getEntries(): Array<{ key: string; entry: CacheEntry<T> }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry: { ...entry },
    }));
  }

  /**
   * Preload data into cache
   */
  async preload(entries: Array<{ key: string; callback: () => Promise<T>; ttl?: number }>): Promise<void> {
    const promises = entries.map(async ({ key, callback, ttl }) => {
      try {
        const data = await callback();
        this.set(key, data, ttl);
      } catch (error) {
        console.warn(`Failed to preload cache entry ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  // Private methods

  private shouldBackgroundRefresh(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    const timeRemaining = entry.expiry - now;
    const totalTtl = entry.expiry - entry.timestamp;
    const remainingPercentage = timeRemaining / totalTtl;

    return remainingPercentage < this.config.backgroundRefreshThreshold;
  }

  private async backgroundRefresh(key: string, callback: () => Promise<T>): Promise<void> {
    // Avoid duplicate refresh requests
    if (this.refreshPromises.has(key)) {
      return;
    }

    const refreshPromise = callback()
      .then(data => {
        this.set(key, data);
        return data;
      })
      .catch(error => {
        console.warn(`Background refresh failed for ${key}:`, error);
        throw error;
      })
      .finally(() => {
        this.refreshPromises.delete(key);
      });

    this.refreshPromises.set(key, refreshPromise);
  }

  private async fetchWithDeduplication(key: string, callback: () => Promise<T>): Promise<T> {
    // Check if there's already a pending request for this key
    const existingPromise = this.refreshPromises.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = callback().finally(() => {
      this.refreshPromises.delete(key);
    });

    this.refreshPromises.set(key, promise);
    return promise;
  }

  private ensureCapacity(newEntrySize: number): void {
    // Check entry count limit
    while (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    // Check size limit
    const maxSizeBytes = this.config.maxSize * 1024 * 1024; // Convert MB to bytes
    while (this.metrics.totalSize + newEntrySize > maxSizeBytes && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.removeFromAccessOrder(lruKey);
    this.metrics.evictions++;
    this.updateCacheSize();
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private updateCacheSize(): void {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
    }
    this.metrics.totalSize = totalSize;
    this.metrics.entryCount = this.cache.size;
  }

  private updateMetrics(type: 'hit' | 'miss', accessTime: number): void {
    if (!this.config.enableMetrics) return;

    if (type === 'hit') {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }

    const totalAccesses = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = this.metrics.hits / totalAccesses;
    
    // Update average access time (simple moving average)
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime * (totalAccesses - 1) + accessTime) / totalAccesses;
  }

  private estimateSize(data: T): number {
    try {
      // Rough estimation of object size in bytes
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch {
      // Fallback estimation
      return 1024; // 1KB default
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.invalidate(key);
    }
  }
}

/**
 * Market-specific cache manager with optimized settings
 */
export class MarketCacheManager extends EnhancedCacheManager {
  constructor() {
    super({
      defaultTtl: 60000, // 60 seconds for market data
      maxSize: 100, // 100MB for market data
      maxEntries: 2000,
      backgroundRefreshThreshold: 0.3, // Refresh when 30% TTL remaining
      enableMetrics: true,
    });
  }

  /**
   * Cache market data with specific TTL based on data type
   */
  setMarketData(key: string, data: any, dataType: 'events' | 'markets' | 'prices' | 'orders'): void {
    const ttlMap = {
      events: 300000, // 5 minutes for events (less frequent changes)
      markets: 60000,  // 1 minute for markets
      prices: 30000,   // 30 seconds for prices (more frequent changes)
      orders: 10000,   // 10 seconds for orders (very frequent changes)
    };

    this.set(key, data, ttlMap[dataType]);
  }

  /**
   * Invalidate all market-related cache entries
   */
  invalidateMarketData(): void {
    this.invalidatePattern(/^(events|markets|prices|orders):/);
  }

  /**
   * Invalidate specific market's cache entries
   */
  invalidateMarket(marketId: string): void {
    this.invalidatePattern(new RegExp(`:(${marketId})|${marketId}:`));
  }
}

/**
 * Global cache manager instances
 */
export const globalCacheManager = new EnhancedCacheManager();
export const marketCacheManager = new MarketCacheManager();

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
  events: (params: any) => `events:${JSON.stringify(params)}`,
  markets: (params: any) => `markets:${JSON.stringify(params)}`,
  market: (id: string) => `market:${id}`,
  event: (id: string) => `event:${id}`,
  prices: (tokenId: string) => `prices:${tokenId}`,
  orderBook: (tokenId: string) => `orderbook:${tokenId}`,
  userOrders: (address: string) => `orders:${address}`,
  userPositions: (address: string) => `positions:${address}`,
  categories: () => 'categories',
  search: (query: string, filters: any) => `search:${query}:${JSON.stringify(filters)}`,
};
/**
 * Enhanced Cache System with File-Hash Invalidation
 * 
 * Features:
 * - SHA-256 content hashing for accurate change detection
 * - Configurable TTL per cache entry
 * - LRU eviction policy
 * - Memory usage tracking
 * - Atomic operations to prevent race conditions
 */

import { TFile, Vault } from 'obsidian';

export interface CacheEntry<T> {
    data: T;
    hash: string;
    timestamp: number;
    ttl: number;
    fileStats?: {
        mtime: number;
        size: number;
    };
    accessCount: number;
    lastAccess: number;
}

export interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsageBytes: number;
}

export interface CacheConfig {
    maxSize?: number;
    defaultTTL?: number;
    enableLRU?: boolean;
    enableStats?: boolean;
    maxMemoryMB?: number;
}

export class EnhancedCache {
    private static instance: EnhancedCache;

    private cache: Map<string, CacheEntry<any>> = new Map();
    private pendingOperations: Map<string, Promise<any>> = new Map();

    // Configuration
    private maxSize: number;
    private defaultTTL: number;
    private enableLRU: boolean;
    private enableStats: boolean;
    private maxMemoryBytes: number;

    // Statistics
    private stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        invalidations: 0
    };

    private constructor(config: CacheConfig = {}) {
        this.maxSize = config.maxSize ?? 1000;
        this.defaultTTL = config.defaultTTL ?? 300000; // 5 minutes
        this.enableLRU = config.enableLRU ?? true;
        this.enableStats = config.enableStats ?? true;
        this.maxMemoryBytes = (config.maxMemoryMB ?? 50) * 1024 * 1024;
    }

    static getInstance(config?: CacheConfig): EnhancedCache {
        if (!EnhancedCache.instance) {
            EnhancedCache.instance = new EnhancedCache(config);
        }
        return EnhancedCache.instance;
    }

    /**
     * Configure cache settings
     */
    configure(config: Partial<CacheConfig>): void {
        if (config.maxSize !== undefined) this.maxSize = config.maxSize;
        if (config.defaultTTL !== undefined) this.defaultTTL = config.defaultTTL;
        if (config.enableLRU !== undefined) this.enableLRU = config.enableLRU;
        if (config.enableStats !== undefined) this.enableStats = config.enableStats;
        if (config.maxMemoryMB !== undefined) this.maxMemoryBytes = config.maxMemoryMB * 1024 * 1024;
    }

    /**
     * Generate SHA-256 hash of content
     */
    private async generateHash(content: string): Promise<string> {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } else {
            // Fallback for environments without crypto.subtle
            return this.simpleHash(content);
        }
    }

    /**
     * Fallback hash function for environments without crypto.subtle
     */
    private simpleHash(content: string): string {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    /**
     * Get cached data or fetch if not available/stale
     */
    async get<T>(
        key: string,
        fetcher: () => Promise<T>,
        options: { ttl?: number; vault?: Vault; file?: TFile } = {}
    ): Promise<T> {
        const ttl = options.ttl ?? this.defaultTTL;

        // Check if there's a pending operation for this key
        if (this.pendingOperations.has(key)) {
            return await this.pendingOperations.get(key)!;
        }

        // Check cache
        const cached = this.cache.get(key);
        const now = Date.now();

        if (cached) {
            // Check if cache is still valid
            const isExpired = (now - cached.timestamp) > cached.ttl;

            if (!isExpired) {
                // If file stats provided, verify file hasn't changed
                if (options.file && options.vault) {
                    const fileStats = await options.vault.adapter.stat(options.file.path);
                    if (fileStats &&
                        cached.fileStats &&
                        fileStats.mtime === cached.fileStats.mtime &&
                        fileStats.size === cached.fileStats.size) {
                        // Cache hit
                        if (this.enableStats) this.stats.hits++;
                        cached.accessCount++;
                        cached.lastAccess = now;
                        return cached.data as T;
                    }
                } else {
                    // No file validation needed - cache hit
                    if (this.enableStats) this.stats.hits++;
                    cached.accessCount++;
                    cached.lastAccess = now;
                    return cached.data as T;
                }
            }
        }

        // Cache miss - fetch data
        if (this.enableStats) this.stats.misses++;

        // Create pending operation to prevent duplicate fetches
        const fetchOperation = this.fetchAndCache(key, fetcher, ttl, options);
        this.pendingOperations.set(key, fetchOperation);

        try {
            const result = await fetchOperation;
            return result;
        } finally {
            this.pendingOperations.delete(key);
        }
    }

    /**
     * Fetch data and store in cache
     */
    private async fetchAndCache<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl: number,
        options: { vault?: Vault; file?: TFile }
    ): Promise<T> {
        const data = await fetcher();

        // Generate hash if data is a string
        let hash = '';
        if (typeof data === 'string') {
            hash = await this.generateHash(data);
        } else if (data && typeof data === 'object') {
            hash = await this.generateHash(JSON.stringify(data));
        }

        // Get file stats if available
        let fileStats: { mtime: number; size: number } | undefined;
        if (options.file && options.vault) {
            const stats = await options.vault.adapter.stat(options.file.path);
            if (stats) {
                fileStats = {
                    mtime: stats.mtime,
                    size: stats.size
                };
            }
        }

        // Store in cache
        const entry: CacheEntry<T> = {
            data,
            hash,
            timestamp: Date.now(),
            ttl,
            fileStats,
            accessCount: 1,
            lastAccess: Date.now()
        };

        this.cache.set(key, entry);

        // Enforce cache size limits
        this.enforceLimits();

        return data;
    }

    /**
     * Directly set a cache entry
     */
    async set<T>(key: string, data: T, ttl?: number): Promise<void> {
        const hash = typeof data === 'string'
            ? await this.generateHash(data)
            : await this.generateHash(JSON.stringify(data));

        const entry: CacheEntry<T> = {
            data,
            hash,
            timestamp: Date.now(),
            ttl: ttl ?? this.defaultTTL,
            accessCount: 0,
            lastAccess: Date.now()
        };

        this.cache.set(key, entry);
        this.enforceLimits();
    }

    /**
     * Invalidate cache by key or pattern
     */
    invalidate(keyOrPattern: string | RegExp): number {
        let invalidated = 0;

        if (typeof keyOrPattern === 'string') {
            if (this.cache.delete(keyOrPattern)) {
                invalidated = 1;
                if (this.enableStats) this.stats.invalidations++;
            }
        } else {
            const keysToDelete: string[] = [];
            for (const key of this.cache.keys()) {
                if (keyOrPattern.test(key)) {
                    keysToDelete.push(key);
                }
            }
            for (const key of keysToDelete) {
                this.cache.delete(key);
                invalidated++;
                if (this.enableStats) this.stats.invalidations++;
            }
        }

        return invalidated;
    }

    /**
     * Invalidate cache entries for a specific file
     */
    async invalidateFile(filePath: string): Promise<number> {
        return this.invalidate(new RegExp(`^${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    }

    /**
     * Check if content has changed by comparing hashes
     */
    async hasChanged(key: string, newContent: string): Promise<boolean> {
        const cached = this.cache.get(key);
        if (!cached) return true;

        const newHash = await this.generateHash(newContent);
        return cached.hash !== newHash;
    }

    /**
     * Enforce cache size and memory limits
     */
    private enforceLimits(): void {
        // Check size limit
        if (this.cache.size > this.maxSize) {
            this.evictLRU();
        }

        // Check memory limit
        const memoryUsage = this.estimateMemoryUsage();
        if (memoryUsage > this.maxMemoryBytes) {
            this.evictLRU();
        }
    }

    /**
     * Evict least recently used entries
     */
    private evictLRU(): void {
        if (!this.enableLRU || this.cache.size === 0) return;

        // Sort entries by last access time
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

        // Remove oldest 10% of entries
        const toRemove = Math.max(1, Math.floor(this.cache.size * 0.1));
        for (let i = 0; i < toRemove && i < entries.length; i++) {
            this.cache.delete(entries[i][0]);
            if (this.enableStats) this.stats.evictions++;
        }
    }

    /**
     * Estimate memory usage of cache
     */
    private estimateMemoryUsage(): number {
        let bytes = 0;

        for (const entry of this.cache.values()) {
            // Rough estimation
            if (typeof entry.data === 'string') {
                bytes += entry.data.length * 2; // UTF-16 encoding
            } else if (entry.data && typeof entry.data === 'object') {
                try {
                    bytes += JSON.stringify(entry.data).length * 2;
                } catch {
                    bytes += 1024; // Default estimate for non-serializable objects
                }
            }
            bytes += entry.hash.length * 2;
            bytes += 100; // Overhead for metadata
        }

        return bytes;
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const memoryUsage = this.estimateMemoryUsage();
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? this.stats.hits / total : 0;

        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate,
            memoryUsageBytes: memoryUsage
        };
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.pendingOperations.clear();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            invalidations: 0
        };
    }

    /**
     * Clean up expired entries
     */
    cleanup(): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if ((now - entry.timestamp) > entry.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * Start automatic cleanup interval
     */
    startAutoCleanup(intervalMs: number = 60000): () => void {
        const intervalId = setInterval(() => {
            const cleaned = this.cleanup();
            if (cleaned > 0) {
                console.log(`[EnhancedCache] Cleaned up ${cleaned} expired entries`);
            }
        }, intervalMs);

        return () => clearInterval(intervalId);
    }
}

// Export singleton instance
export const enhancedCache = EnhancedCache.getInstance();


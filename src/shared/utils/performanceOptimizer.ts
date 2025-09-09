import { App, Vault } from 'obsidian';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

interface PerformanceStats {
    cacheHits: number;
    cacheMisses: number;
    averageLoadTime: number;
    totalRequests: number;
    memoryUsage: number;
    lazyLoaded: string[];
}

class PerformanceOptimizer {
    private static instance: PerformanceOptimizer;
    private app: App;
    private cache: Map<string, CacheEntry<any>> = new Map();
    private stats: PerformanceStats = {
        cacheHits: 0,
        cacheMisses: 0,
        averageLoadTime: 0,
        totalRequests: 0,
        memoryUsage: 0,
        lazyLoaded: []
    };
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private maxCacheSize = 100; // Maximum number of cached items

    private constructor(app: App) {
        this.app = app;
    }

    static getInstance(app: App): PerformanceOptimizer {
        if (!PerformanceOptimizer.instance) {
            PerformanceOptimizer.instance = new PerformanceOptimizer(app);
        }
        return PerformanceOptimizer.instance;
    }

    async initialize(): Promise<void> {
        console.log('[PerformanceOptimizer] Initializing...');

        // Pre-warm cache with commonly accessed data
        await this.preWarmCache();

        // Set up periodic cache cleanup
        setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Every 5 minutes

        console.log('[PerformanceOptimizer] Initialized successfully');
    }

    private async preWarmCache(): Promise<void> {
        try {
            // Pre-load player data
            await this.getPlayerData();

            // Pre-load basic boss data
            await this.getBossData();

            console.log('[PerformanceOptimizer] Cache pre-warmed');
        } catch (error) {
            console.warn('[PerformanceOptimizer] Pre-warming failed:', error);
        }
    }

    // Generic cache getter with TTL
    async getCached<T>(key: string, fetcher: () => Promise<T>, ttl: number = 5 * 60 * 1000): Promise<T> {
        const startTime = Date.now();
        this.stats.totalRequests++;

        // Check cache first
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
            this.stats.cacheHits++;
            return cached.data;
        }

        // Cache miss - fetch new data
        this.stats.cacheMisses++;
        try {
            const data = await fetcher();

            // Store in cache
            this.cache.set(key, {
                data,
                timestamp: Date.now(),
                ttl
            });

            // Enforce cache size limit
            if (this.cache.size > this.maxCacheSize) {
                this.evictOldest();
            }

            // Update stats
            const loadTime = Date.now() - startTime;
            this.stats.averageLoadTime = (this.stats.averageLoadTime + loadTime) / 2;

            return data;
        } catch (error) {
            console.error(`[PerformanceOptimizer] Failed to fetch data for key ${key}:`, error);
            throw error;
        }
    }

    // Cache invalidation
    invalidateCache(pattern?: string): void {
        if (pattern) {
            // Invalidate cache entries matching pattern
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            // Clear all cache
            this.cache.clear();
        }
    }

    // Debounce utility
    debounce<T extends (...args: any[]) => any>(
        key: string,
        func: T,
        delay: number
    ): (...args: Parameters<T>) => void {
        return (...args: Parameters<T>) => {
            // Clear existing timer
            const existingTimer = this.debounceTimers.get(key);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            // Set new timer
            const timer = setTimeout(() => {
                func(...args);
                this.debounceTimers.delete(key);
            }, delay);

            this.debounceTimers.set(key, timer);
        };
    }

    // Throttle utility
    throttle<T extends (...args: any[]) => any>(
        key: string,
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle: boolean;

        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Batch processing utility
    async processBatch<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        batchSize: number = 10,
        delay: number = 10
    ): Promise<R[]> {
        const results: R[] = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(processor));
            results.push(...batchResults);

            // Small delay between batches to prevent blocking
            if (i + batchSize < items.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return results;
    }

    // Specific cache methods for boss battle system
    async getPlayerData(): Promise<any> {
        return this.getCached('player-data', async () => {
            const { playerStore } = await import('../state/playerStore');
            return await playerStore.get();
        }, 2 * 60 * 1000); // 2 minutes cache
    }

    async getBossData(): Promise<any> {
        return this.getCached('boss-data', async () => {
            const { bossManagementService } = await import('../../features/quests/utils/bossManagementService');
            return bossManagementService.getActiveBosses();
        }, 5 * 60 * 1000); // 5 minutes cache
    }

    async getQuestData(): Promise<any> {
        return this.getCached('quest-data', async () => {
            // This would be implemented based on your quest loading logic
            return [];
        }, 2 * 60 * 1000); // 2 minutes cache
    }

    async getSkillData(): Promise<any> {
        return this.getCached('skill-data', async () => {
            const { getAllSkills } = await import('./skillDiscovery');
            return await getAllSkills(this.app.vault);
        }, 5 * 60 * 1000); // 5 minutes cache
    }

    // Lazy loading tracker
    trackLazyLoad(componentName: string): void {
        if (!this.stats.lazyLoaded.includes(componentName)) {
            this.stats.lazyLoaded.push(componentName);
        }
    }

    // Memory usage tracking
    updateMemoryUsage(): void {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            this.stats.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        }
    }

    // Cache cleanup
    private cleanupCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }

    // Evict oldest cache entries
    private evictOldest(): void {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Remove oldest 20% of entries
        const toRemove = Math.ceil(entries.length * 0.2);
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    // Get performance statistics
    getStats(): PerformanceStats {
        this.updateMemoryUsage();
        return { ...this.stats };
    }

    // Reset statistics
    resetStats(): void {
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            averageLoadTime: 0,
            totalRequests: 0,
            memoryUsage: 0,
            lazyLoaded: []
        };
    }

    // Cleanup method for plugin unload
    cleanup(): void {
        console.log('[PerformanceOptimizer] Cleaning up...');

        // Clear all debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();

        // Clear cache
        this.cache.clear();

        // Reset stats
        this.resetStats();

        console.log('[PerformanceOptimizer] Cleanup completed');
    }

    // Optimized file scanning with batching
    async scanFilesOptimized(
        files: any[],
        processor: (file: any) => Promise<any>,
        batchSize: number = 10
    ): Promise<any[]> {
        return this.processBatch(files, processor, batchSize);
    }

    // Optimized vault operations
    async readFileOptimized(file: any): Promise<string> {
        const cacheKey = `file-content-${file.path}`;
        return this.getCached(cacheKey, () => this.app.vault.read(file), 1 * 60 * 1000); // 1 minute cache
    }

    // Batch file reading
    async readFilesBatch(files: any[]): Promise<Map<string, string>> {
        const results = new Map<string, string>();

        await this.processBatch(files, async (file) => {
            try {
                const content = await this.readFileOptimized(file);
                results.set(file.path, content);
            } catch (error) {
                console.error(`Failed to read file ${file.path}:`, error);
            }
        }, 5); // Smaller batch size for file operations

        return results;
    }
}

export { PerformanceOptimizer };

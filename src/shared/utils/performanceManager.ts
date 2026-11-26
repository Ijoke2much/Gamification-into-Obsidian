/**
 * Performance Manager
 * 
 * Centralized coordinator for all performance optimization systems:
 * - Enhanced cache with file-hash invalidation
 * - Debounced write manager
 * - Workerized parsing
 * - Performance monitoring and metrics
 */

import { Vault } from 'obsidian';
import { EnhancedCache } from './enhancedCache';
import { DebouncedWriteManager } from './debouncedWriteManager';
import { WorkerizedParser, ParseTask } from './workerizedParser';
import { GamificationPluginSettings } from '../../core/settings';

export interface PerformanceMetrics {
    cache: {
        hits: number;
        misses: number;
        hitRate: number;
        size: number;
        memoryUsageMB: number;
    };
    writes: {
        total: number;
        batched: number;
        failed: number;
        pending: number;
    };
    parsing: {
        totalWorkers: number;
        availableWorkers: number;
        pendingTasks: number;
    };
}

export class PerformanceManager {
    private static instance: PerformanceManager;

    private cache: EnhancedCache;
    private writeManager: DebouncedWriteManager;
    private parser: WorkerizedParser;
    private settings: Required<NonNullable<GamificationPluginSettings['performanceSettings']>>;
    private cleanupInterval?: ReturnType<typeof setInterval>;

    private constructor() {
        this.cache = EnhancedCache.getInstance();
        this.writeManager = DebouncedWriteManager.getInstance();
        this.parser = WorkerizedParser.getInstance();
        this.settings = {
            enableCache: true,
            cacheTTL: 300000,
            maxCacheSize: 1000,
            maxCacheMemoryMB: 50,
            enableDebouncedWrites: true,
            writeDebounceDelay: 1000,
            maxWriteBatchSize: 10,
            enableWorkerParsing: true,
            maxWorkers: 2,
            parsingChunkSize: 1000,
            autoCleanupInterval: 60000
        };
    }

    static getInstance(): PerformanceManager {
        if (!PerformanceManager.instance) {
            PerformanceManager.instance = new PerformanceManager();
        }
        return PerformanceManager.instance;
    }

    /**
     * Initialize performance systems with vault and settings
     */
    initialize(vault: Vault, settings?: GamificationPluginSettings['performanceSettings']): void {
        console.log('[PerformanceManager] Initializing performance systems...');

        // Merge provided settings with defaults
        if (settings) {
            this.settings = {
                ...this.settings,
                ...settings
            } as Required<NonNullable<GamificationPluginSettings['performanceSettings']>>;
        }

        // Configure cache
        if (this.settings.enableCache) {
            this.cache.configure({
                defaultTTL: this.settings.cacheTTL,
                maxSize: this.settings.maxCacheSize,
                maxMemoryMB: this.settings.maxCacheMemoryMB,
                enableLRU: true,
                enableStats: true
            });

            // Start auto cleanup
            if (this.settings.autoCleanupInterval > 0) {
                this.cache.startAutoCleanup(this.settings.autoCleanupInterval);
            }
        }

        // Configure write manager
        if (this.settings.enableDebouncedWrites) {
            this.writeManager.setVault(vault);
            this.writeManager.configure({
                debounceDelay: this.settings.writeDebounceDelay,
                maxBatchSize: this.settings.maxWriteBatchSize,
                enableBatching: true,
                maxRetries: 3,
                retryDelay: 1000
            });
        }

        // Parser is already initialized with workers
        console.log('[PerformanceManager] Performance systems initialized');
    }

    /**
     * Get or create cached data
     */
    async getCached<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: {
            ttl?: number;
            vault?: Vault;
            filePath?: string;
        }
    ): Promise<T> {
        if (!this.settings.enableCache) {
            return await fetcher();
        }

        // Get file if filePath provided
        let file;
        if (options?.vault && options?.filePath) {
            const abstractFile = options.vault.getAbstractFileByPath(options.filePath);
            file = abstractFile && 'stat' in abstractFile ? abstractFile : undefined;
        }

        return await this.cache.get(key, fetcher, {
            ttl: options?.ttl,
            vault: options?.vault,
            file: file as any
        });
    }

    /**
     * Invalidate cache by key or pattern
     */
    invalidateCache(keyOrPattern: string | RegExp): number {
        return this.cache.invalidate(keyOrPattern);
    }

    /**
     * Invalidate cache for a specific file
     */
    async invalidateFile(filePath: string): Promise<number> {
        return await this.cache.invalidateFile(filePath);
    }

    /**
     * Queue a file write with debouncing
     */
    async queueWrite(
        filePath: string,
        content: string | ((current: string) => string | Promise<string>),
        priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
    ): Promise<void> {
        if (!this.settings.enableDebouncedWrites) {
            // Direct write if debouncing disabled
            const vault = this.writeManager['vault'];
            if (!vault) {
                throw new Error('[PerformanceManager] Vault not set in write manager');
            }

            const file = vault.getAbstractFileByPath(filePath);
            if (file && 'stat' in file) {
                const finalContent = typeof content === 'function'
                    ? await content(await vault.read(file as any))
                    : content;
                await vault.modify(file as any, finalContent);
            } else {
                const finalContent = typeof content === 'function'
                    ? await content('')
                    : content;
                await vault.create(filePath, finalContent);
            }
            return;
        }

        await this.writeManager.queueWrite(filePath, content, priority);
    }

    /**
     * Flush all pending writes immediately
     */
    async flushWrites(): Promise<void> {
        await this.writeManager.flush();
    }

    /**
     * Parse content using workers if available
     */
    async parseQuests(task: ParseTask) {
        if (!this.settings.enableWorkerParsing) {
            // Use the main thread parser
            const { parseQuestsFromMarkdown } = await import('../../features/quests/utils/taskParser');
            const startTime = performance.now();
            const quests = await parseQuestsFromMarkdown(task.content);
            const parseTime = performance.now() - startTime;

            return {
                quests,
                parseTime,
                usedWorker: false
            };
        }

        return await this.parser.parse({
            ...task,
            options: {
                chunkSize: this.settings.parsingChunkSize,
                useWorker: true,
                timeout: 10000,
                ...task.options
            }
        });
    }

    /**
     * Get comprehensive performance metrics
     */
    getMetrics(): PerformanceMetrics {
        const cacheStats = this.cache.getStats();
        const writeStats = this.writeManager.getStats();
        const parserStatus = this.parser.getStatus();

        return {
            cache: {
                hits: cacheStats.hits,
                misses: cacheStats.misses,
                hitRate: cacheStats.hitRate,
                size: cacheStats.size,
                memoryUsageMB: cacheStats.memoryUsageBytes / (1024 * 1024)
            },
            writes: {
                total: writeStats.totalWrites,
                batched: writeStats.batchedWrites,
                failed: writeStats.failedWrites,
                pending: this.writeManager.getPendingCount()
            },
            parsing: {
                totalWorkers: parserStatus.totalWorkers,
                availableWorkers: parserStatus.availableWorkers,
                pendingTasks: parserStatus.pendingTasks
            }
        };
    }

    /**
     * Log performance metrics to console
     */
    logMetrics(): void {
        const metrics = this.getMetrics();

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 PERFORMANCE METRICS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        console.log('\n💾 Cache:');
        console.log(`  Hits: ${metrics.cache.hits}`);
        console.log(`  Misses: ${metrics.cache.misses}`);
        console.log(`  Hit Rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%`);
        console.log(`  Size: ${metrics.cache.size} entries`);
        console.log(`  Memory: ${metrics.cache.memoryUsageMB.toFixed(2)} MB`);

        console.log('\n✍️  Writes:');
        console.log(`  Total: ${metrics.writes.total}`);
        console.log(`  Batched: ${metrics.writes.batched}`);
        console.log(`  Failed: ${metrics.writes.failed}`);
        console.log(`  Pending: ${metrics.writes.pending}`);

        console.log('\n⚙️  Workers:');
        console.log(`  Total: ${metrics.parsing.totalWorkers}`);
        console.log(`  Available: ${metrics.parsing.availableWorkers}`);
        console.log(`  Pending: ${metrics.parsing.pendingTasks}`);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    /**
     * Clear all caches
     */
    clearAllCaches(): void {
        this.cache.clear();
        console.log('[PerformanceManager] All caches cleared');
    }

    /**
     * Update settings at runtime
     */
    updateSettings(settings?: Partial<GamificationPluginSettings['performanceSettings']>): void {
        if (!settings) return;

        // Merge settings properly
        this.settings = {
            ...this.settings,
            ...settings
        } as Required<NonNullable<GamificationPluginSettings['performanceSettings']>>;

        // Reconfigure systems
        if (settings.cacheTTL !== undefined ||
            settings.maxCacheSize !== undefined ||
            settings.maxCacheMemoryMB !== undefined) {
            this.cache.configure({
                defaultTTL: this.settings.cacheTTL,
                maxSize: this.settings.maxCacheSize,
                maxMemoryMB: this.settings.maxCacheMemoryMB
            });
        }

        if (settings.writeDebounceDelay !== undefined ||
            settings.maxWriteBatchSize !== undefined) {
            this.writeManager.configure({
                debounceDelay: this.settings.writeDebounceDelay,
                maxBatchSize: this.settings.maxWriteBatchSize
            });
        }

        console.log('[PerformanceManager] Settings updated');
    }

    /**
     * Clean up on plugin unload
     */
    async destroy(): Promise<void> {
        console.log('[PerformanceManager] Destroying performance systems...');

        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Flush pending writes
        await this.writeManager.flush();

        // Destroy write manager
        await this.writeManager.destroy();

        // Destroy parser workers
        this.parser.destroy();

        // Clear caches
        this.cache.clear();

        console.log('[PerformanceManager] Performance systems destroyed');
    }
}

// Export singleton instance
export const performanceManager = PerformanceManager.getInstance();


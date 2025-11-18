import { TFile, Vault } from 'obsidian';
import { SkillTreeStats, PlayerStats } from '../../features/quests/types/BossTypes';

/**
 * Performance cache for frequently accessed data
 * Reduces file system reads and improves UI responsiveness
 */
export class PerformanceCache {
    private static instance: PerformanceCache;

    // Cache for skill tree stats
    private skillStatsCache: {
        data: SkillTreeStats | null;
        timestamp: number;
        ttl: number; // Time to live in milliseconds
    } = {
            data: null,
            timestamp: 0,
            ttl: 30000 // 30 seconds
        };

    // Cache for player battle stats
    private playerStatsCache: {
        data: PlayerStats | null;
        timestamp: number;
        ttl: number;
    } = {
            data: null,
            timestamp: 0,
            ttl: 30000 // 30 seconds
        };

    // Cache for boss data
    private bossDataCache: Map<string, {
        data: any;
        timestamp: number;
        ttl: number;
    }> = new Map();

    // Cache for file contents
    private fileContentCache: Map<string, {
        content: string;
        timestamp: number;
        ttl: number;
        fileStats: { mtime: number; size: number };
    }> = new Map();

    // Pending operations to prevent duplicate requests
    private pendingOperations: Map<string, Promise<any>> = new Map();

    private constructor() { }

    static getInstance(): PerformanceCache {
        if (!PerformanceCache.instance) {
            PerformanceCache.instance = new PerformanceCache();
        }
        return PerformanceCache.instance;
    }

    /**
     * Cache skill tree stats with automatic invalidation
     */
    setSkillStats(stats: SkillTreeStats): void {
        this.skillStatsCache = {
            data: stats,
            timestamp: Date.now(),
            ttl: 30000
        };
    }

    /**
     * Get cached skill tree stats if still valid
     */
    getSkillStats(): SkillTreeStats | null {
        const now = Date.now();
        if (this.skillStatsCache.data &&
            (now - this.skillStatsCache.timestamp) < this.skillStatsCache.ttl) {
            return this.skillStatsCache.data;
        }
        return null;
    }

    /**
     * Cache player battle stats
     */
    setPlayerStats(stats: PlayerStats): void {
        this.playerStatsCache = {
            data: stats,
            timestamp: Date.now(),
            ttl: 30000
        };
    }

    /**
     * Get cached player battle stats if still valid
     */
    getPlayerStats(): PlayerStats | null {
        const now = Date.now();
        if (this.playerStatsCache.data &&
            (now - this.playerStatsCache.timestamp) < this.playerStatsCache.ttl) {
            return this.playerStatsCache.data;
        }
        return null;
    }

    /**
     * Cache file content with file modification tracking
     */
    async cacheFileContent(vault: Vault, file: TFile): Promise<string> {
        const filePath = file.path;

        try {
            const fileStats = await vault.adapter.stat(filePath);

            // Check if we have a valid cached version
            const cached = this.fileContentCache.get(filePath);
            if (cached && fileStats &&
                cached.fileStats.mtime === fileStats.mtime &&
                cached.fileStats.size === fileStats.size &&
                (Date.now() - cached.timestamp) < cached.ttl) {
                return cached.content;
            }

            // Check if there's a pending read operation for this file
            if (this.pendingOperations.has(filePath)) {
                return await this.pendingOperations.get(filePath)!;
            }

            // Create new read operation
            const readOperation = vault.read(file);
            this.pendingOperations.set(filePath, readOperation);

            try {
                const content = await readOperation;

                // Cache the content
                this.fileContentCache.set(filePath, {
                    content,
                    timestamp: Date.now(),
                    ttl: 60000, // 1 minute for file content
                    fileStats: {
                        mtime: fileStats?.mtime || 0,
                        size: fileStats?.size || 0
                    }
                });

                return content;
            } finally {
                this.pendingOperations.delete(filePath);
            }
        } catch (error) {
            // Fallback to direct read if file stats fail
            return await vault.read(file);
        }
    }

    /**
     * Cache boss data with custom TTL
     */
    setBossData(bossId: string, data: any, ttl: number = 60000): void {
        this.bossDataCache.set(bossId, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * Get cached boss data if still valid
     */
    getBossData(bossId: string): any | null {
        const cached = this.bossDataCache.get(bossId);
        if (cached) {
            const now = Date.now();
            if ((now - cached.timestamp) < cached.ttl) {
                return cached.data;
            } else {
                this.bossDataCache.delete(bossId);
            }
        }
        return null;
    }

    /**
     * Get cached file content if still valid
     */
    getCachedFileContent(filePath: string): string | null {
        const cached = this.fileContentCache.get(filePath);
        if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
            return cached.content;
        }
        return null;
    }

    /**
     * Invalidate specific cache entries
     */
    invalidateSkillStats(): void {
        this.skillStatsCache.data = null;
        this.skillStatsCache.timestamp = 0;
    }

    invalidatePlayerStats(): void {
        this.playerStatsCache.data = null;
        this.playerStatsCache.timestamp = 0;
    }

    invalidateBossData(bossId: string): void {
        this.bossDataCache.delete(bossId);
    }

    invalidateFileContent(filePath: string): void {
        this.fileContentCache.delete(filePath);
    }

    /**
     * Clean up expired cache entries
     */
    cleanup(): void {
        const now = Date.now();

        // Clean up skill stats cache
        if (this.skillStatsCache.data &&
            (now - this.skillStatsCache.timestamp) >= this.skillStatsCache.ttl) {
            this.skillStatsCache.data = null;
        }

        // Clean up player stats cache
        if (this.playerStatsCache.data &&
            (now - this.playerStatsCache.timestamp) >= this.playerStatsCache.ttl) {
            this.playerStatsCache.data = null;
        }

        // Clean up boss data cache
        for (const [bossId, cached] of this.bossDataCache.entries()) {
            if ((now - cached.timestamp) >= cached.ttl) {
                this.bossDataCache.delete(bossId);
            }
        }

        // Clean up file content cache
        for (const [filePath, cached] of this.fileContentCache.entries()) {
            if ((now - cached.timestamp) >= cached.ttl) {
                this.fileContentCache.delete(filePath);
            }
        }
    }

    /**
     * Get cache statistics for monitoring
     */
    getStats(): {
        skillStatsHit: boolean;
        playerStatsHit: boolean;
        bossDataCount: number;
        fileContentCount: number;
        pendingOperations: number;
    } {
        const now = Date.now();

        return {
            skillStatsHit: this.skillStatsCache.data !== null &&
                (now - this.skillStatsCache.timestamp) < this.skillStatsCache.ttl,
            playerStatsHit: this.playerStatsCache.data !== null &&
                (now - this.playerStatsCache.timestamp) < this.playerStatsCache.ttl,
            bossDataCount: this.bossDataCache.size,
            fileContentCount: this.fileContentCache.size,
            pendingOperations: this.pendingOperations.size
        };
    }

    /**
     * Clear all caches
     */
    clearAll(): void {
        this.skillStatsCache.data = null;
        this.skillStatsCache.timestamp = 0;
        this.playerStatsCache.data = null;
        this.playerStatsCache.timestamp = 0;
        this.bossDataCache.clear();
        this.fileContentCache.clear();
        this.pendingOperations.clear();
    }

    /**
     * Start automatic cleanup interval
     */
    startCleanupInterval(): void {
        setInterval(() => {
            this.cleanup();
        }, 60000); // Clean up every minute
    }
}

// Export singleton instance
export const performanceCache = PerformanceCache.getInstance();
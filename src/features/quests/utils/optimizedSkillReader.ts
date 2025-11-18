import { Vault, TFile } from 'obsidian';
const matter = require('gray-matter');

// Import mobile-safe parser from skillDiscovery
import { parseFrontmatterMobile, isMobile } from '../../../shared/utils/skillDiscovery';
import { SkillTreeStats, PlayerStats } from '../types/BossTypes';
import { performanceCache } from '../../../shared/utils/performanceCache';

/**
 * Optimized skill tree reader with caching and lazy loading
 * Dramatically improves performance for frequent stat access
 */
export class OptimizedSkillReader {
    private static fileSystemCache: Map<string, { files: TFile[]; timestamp: number }> = new Map();
    private static readonly FILESYSTEM_CACHE_TTL = 10000; // 10 seconds

    /**
     * Read skill tree stats with caching and optimization
     */
    static async readSkillTreeStats(vault: Vault, forceRefresh = false): Promise<SkillTreeStats> {
        // Check cache first unless force refresh
        if (!forceRefresh) {
            const cached = performanceCache.getSkillStats();
            if (cached) {
                return cached;
            }
        }

        try {
            // Get skill tree files with filesystem caching
            const skillFiles = await this.getSkillTreeFiles(vault);
            const stats: SkillTreeStats = {};

            // Process files in parallel for better performance
            const filePromises = skillFiles.map(async (file) => {
                try {
                    const content = await performanceCache.cacheFileContent(vault, file);
                    const { data } = isMobile ? parseFrontmatterMobile(content) : matter(content);

                    if (data.name) {
                        return {
                            name: data.name,
                            stat: {
                                name: data.name,
                                level: data.level || 1,
                                currentCP: data.currentCP || data.cp || 0,
                                requiredCP: data.requiredCP || data.maxCP || 100,
                                totalCP: data.totalCP || data.currentCP || data.cp || 0,
                                filePath: file.path
                            }
                        };
                    }
                    return null;
                } catch (error) {
                    console.warn(`Failed to read stat file ${file.path}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(filePromises);

            // Build stats object from results
            results.forEach(result => {
                if (result) {
                    stats[result.name] = result.stat;
                }
            });

            // Cache the results
            performanceCache.setSkillStats(stats);

            return stats;
        } catch (error) {
            console.error('Failed to read skill tree stats:', error);
            return {};
        }
    }

    /**
     * Convert skill tree stats to player stats with caching
     */
    static convertToPlayerStats(skillTreeStats: SkillTreeStats, useCache = true): PlayerStats {
        if (useCache) {
            const cached = performanceCache.getPlayerStats();
            if (cached) {
                return cached;
            }
        }

        const playerStats: PlayerStats = {
            strength: 1,
            endurance: 1,
            intelligence: 1,
            creativity: 1,
            charisma: 1,
            dexterity: 1,
            faith: 1,
            ingenuity: 1,
            mindfulness: 1,
            willpower: 1,
            wisdom: 1,
            // Legacy aliases
            focus: 1,
            motivation: 1,
            patience: 1,
            agility: 1
        };

        // Optimized stat mapping with case-insensitive lookup
        const statMapping: Record<string, keyof PlayerStats> = {
            'strength': 'strength', 'Strength': 'strength',
            'endurance': 'endurance', 'Endurance': 'endurance',
            'focus': 'focus', 'Focus': 'focus',
            'intelligence': 'intelligence', 'Intelligence': 'intelligence',
            'creativity': 'creativity', 'Creativity': 'creativity',
            'motivation': 'motivation', 'Motivation': 'motivation',
            'patience': 'patience', 'Patience': 'patience',
            'agility': 'agility', 'Agility': 'agility',
            'charisma': 'charisma', 'Charisma': 'charisma'
        };

        // Fast iteration over skill tree stats
        for (const [skillName, skillData] of Object.entries(skillTreeStats)) {
            const battleStatName = statMapping[skillName];
            if (battleStatName) {
                playerStats[battleStatName] = skillData.level;
            }
        }

        // Cache the converted stats
        performanceCache.setPlayerStats(playerStats);

        return playerStats;
    }

    /**
     * Get skill tree files with filesystem caching
     */
    private static async getSkillTreeFiles(vault: Vault): Promise<TFile[]> {
        const cacheKey = 'skill-tree-files';
        const now = Date.now();

        // Check filesystem cache
        const cached = this.fileSystemCache.get(cacheKey);
        if (cached && (now - cached.timestamp) < this.FILESYSTEM_CACHE_TTL) {
            return cached.files;
        }

        // Get all files and filter for skill tree stats
        const allFiles = vault.getFiles();
        const skillFiles = allFiles.filter(file =>
            file instanceof TFile &&
            file.path.startsWith('SkillTree/Master-Class/Stats/') &&
            file.path.endsWith('.md')
        );

        // Cache the file list
        this.fileSystemCache.set(cacheKey, {
            files: skillFiles,
            timestamp: now
        });

        return skillFiles;
    }

    /**
     * Preload skill tree data in background
     */
    static async preloadSkillData(vault: Vault): Promise<void> {
        try {
            // Start loading in background without waiting
            setTimeout(async () => {
                await this.readSkillTreeStats(vault, false);
            }, 100);
        } catch (error) {
            console.warn('Failed to preload skill data:', error);
        }
    }

    /**
     * Batch read multiple skill files efficiently
     */
    static async batchReadSkillFiles(vault: Vault, skillNames: string[]): Promise<Map<string, any>> {
        const results = new Map();

        try {
            const allFiles = await this.getSkillTreeFiles(vault);
            const targetFiles = allFiles.filter(file => {
                const fileName = file.basename.toLowerCase();
                return skillNames.some(name => fileName.includes(name.toLowerCase()));
            });

            const filePromises = targetFiles.map(async (file) => {
                try {
                    const content = await performanceCache.cacheFileContent(vault, file);
                    const { data } = isMobile ? parseFrontmatterMobile(content) : matter(content);

                    if (data.name) {
                        results.set(data.name, {
                            name: data.name,
                            level: data.level || 1,
                            currentCP: data.currentCP || data.cp || 0,
                            requiredCP: data.requiredCP || data.maxCP || 100,
                            totalCP: data.totalCP || data.currentCP || data.cp || 0,
                            filePath: file.path,
                            class: data.class,
                            stats: data.stats,
                            description: data.Description || data.description
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to read skill file ${file.path}:`, error);
                }
            });

            await Promise.all(filePromises);
        } catch (error) {
            console.error('Failed to batch read skill files:', error);
        }

        return results;
    }

    /**
     * Invalidate caches when files change
     */
    static invalidateCache(filePath?: string): void {
        if (filePath) {
            // Invalidate specific file
            performanceCache.invalidateFileContent(filePath);

            // If it's a skill tree file, invalidate related caches
            if (filePath.startsWith('SkillTree/Master-Class/Stats/')) {
                performanceCache.invalidateSkillStats();
                performanceCache.invalidatePlayerStats();
            }
        } else {
            // Invalidate all skill-related caches
            performanceCache.invalidateSkillStats();
            performanceCache.invalidatePlayerStats();
            this.fileSystemCache.clear();
        }
    }

    /**
     * Get performance statistics
     */
    static getPerformanceStats(): {
        cacheStats: any;
        fileSystemCacheSize: number;
    } {
        return {
            cacheStats: performanceCache.getStats(),
            fileSystemCacheSize: this.fileSystemCache.size
        };
    }
}

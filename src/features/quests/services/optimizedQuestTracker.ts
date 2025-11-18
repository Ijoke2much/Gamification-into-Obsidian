import { TFile, TAbstractFile, App, Notice } from 'obsidian';
import { bossManagementService } from '../utils/bossManagementService';
import { Boss, BossProgress, BossRewards } from '../types/BossTypes';
import { Quest } from '../utils/taskParser';
import { performanceCache } from '../../../shared/utils/performanceCache';
import type GamifiedObsidianPlugin from '../../../core/main';

/**
 * Optimized quest completion tracker with improved performance
 * Features: debouncing, batching, caching, and smart file monitoring
 */
export class OptimizedQuestTracker {
    private app: App;
    private plugin: GamifiedObsidianPlugin;
    private isMonitoring = false;

    // Performance optimizations
    private processedTasks = new Set<string>();
    private debounceTimers = new Map<string, NodeJS.Timeout>();
    private batchQueue = new Map<string, { file: TFile; changes: string[] }>();
    private processingQueue = false;

    // Configurable performance settings
    private readonly DEBOUNCE_DELAY = 1000; // 1 second
    private readonly BATCH_DELAY = 2000; // 2 seconds
    private readonly MAX_BATCH_SIZE = 10;
    private readonly CACHE_TTL = 30000; // 30 seconds

    constructor(app: App, plugin: GamifiedObsidianPlugin) {
        this.app = app;
        this.plugin = plugin;

        // Start performance monitoring
        this.startPerformanceMonitoring();
    }

    /**
     * Start optimized monitoring with performance enhancements
     */
    startMonitoring(): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        // Use optimized file change listener
        this.app.vault.on('modify', this.handleFileModifyOptimized.bind(this));

        // Preload initial data in background
        this.performBackgroundInitialization();

        console.log('Optimized quest tracker started with performance enhancements');
        new Notice('🎯 Enhanced boss quest tracking activated!');
    }

    /**
     * Stop monitoring and cleanup
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;

        // Clear all debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();

        // Clear batch queue
        this.batchQueue.clear();

        console.log('Optimized quest tracker stopped');
    }

    /**
     * Optimized file modification handler with debouncing and batching
     */
    private handleFileModifyOptimized(file: TAbstractFile): void {
        if (!(file instanceof TFile) || !file.path.endsWith('.md')) return;

        const filePath = file.path;

        // Clear existing debounce timer for this file
        const existingTimer = this.debounceTimers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new debounce timer
        const debounceTimer = setTimeout(() => {
            this.addToBatchQueue(file);
            this.debounceTimers.delete(filePath);
        }, this.DEBOUNCE_DELAY);

        this.debounceTimers.set(filePath, debounceTimer);
    }

    /**
     * Add file to batch processing queue
     */
    private addToBatchQueue(file: TFile): void {
        const filePath = file.path;

        // Add to batch queue
        if (!this.batchQueue.has(filePath)) {
            this.batchQueue.set(filePath, { file, changes: [] });
        }

        // Schedule batch processing if not already scheduled
        if (!this.processingQueue && this.batchQueue.size > 0) {
            setTimeout(() => {
                this.processBatchQueue();
            }, this.BATCH_DELAY);
        }
    }

    /**
     * Process batch queue efficiently
     */
    private async processBatchQueue(): Promise<void> {
        if (this.processingQueue || this.batchQueue.size === 0) return;

        this.processingQueue = true;
        const batch = Array.from(this.batchQueue.values());
        this.batchQueue.clear();

        try {
            // Process files in parallel with limited concurrency
            const chunkSize = Math.min(this.MAX_BATCH_SIZE, batch.length);

            for (let i = 0; i < batch.length; i += chunkSize) {
                const chunk = batch.slice(i, i + chunkSize);
                const promises = chunk.map(({ file }) =>
                    this.scanFileForCompletedQuestsOptimized(file)
                );

                await Promise.all(promises);
            }
        } catch (error) {
            console.error('Failed to process batch queue:', error);
        } finally {
            this.processingQueue = false;

            // If more items were added while processing, schedule another batch
            if (this.batchQueue.size > 0) {
                setTimeout(() => this.processBatchQueue(), this.BATCH_DELAY);
            }
        }
    }

    /**
     * Optimized file scanning with caching
     */
    private async scanFileForCompletedQuestsOptimized(file: TFile, silent = false): Promise<void> {
        try {
            // Use cached content if available
            const content = await performanceCache.cacheFileContent(this.app.vault, file);
            const lines = content.split('\n');

            // Batch process lines for better performance
            const completedTasks: Array<{ lineIndex: number; line: string; taskId: string }> = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (this.isCompletedTask(line) && this.isBossTask(line)) {
                    const taskId = this.generateTaskId(file.path, i, line);

                    if (!this.processedTasks.has(taskId)) {
                        completedTasks.push({ lineIndex: i, line, taskId });
                    }
                }
            }

            // Process completed tasks in batch
            if (completedTasks.length > 0) {
                await this.processBatchCompletions(file, completedTasks, silent);
            }

        } catch (error) {
            console.error(`Failed to scan file ${file.path}:`, error);
        }
    }

    /**
     * Process multiple task completions in batch
     */
    private async processBatchCompletions(
        file: TFile,
        completedTasks: Array<{ lineIndex: number; line: string; taskId: string }>,
        silent = false
    ): Promise<void> {
        try {
            // Get active bosses once for the batch
            const activeBosses = bossManagementService.getActiveBosses();

            if (activeBosses.length === 0) {
                if (!silent) {
                    console.log('No active bosses to damage');
                }
                return;
            }

            // Group tasks by target boss for efficient processing
            const tasksByBoss = this.groupTasksByBoss(completedTasks, activeBosses);

            // Process each boss's tasks
            for (const [bossData, tasks] of tasksByBoss.entries()) {
                const totalDamage = tasks.reduce((sum, task) =>
                    sum + this.calculateQuestDamage(task.line, file.path), 0
                );

                await this.dealBatchDamageToBoss(bossData, totalDamage, tasks, file.path, silent);
            }

            // Mark all tasks as processed
            completedTasks.forEach(task => {
                this.processedTasks.add(task.taskId);
            });

        } catch (error) {
            console.error('Failed to process batch completions:', error);
        }
    }

    /**
     * Group tasks by target boss for batch processing
     */
    private groupTasksByBoss(
        completedTasks: Array<{ lineIndex: number; line: string; taskId: string }>,
        activeBosses: Array<{ boss: Boss; progress: BossProgress; quest: Quest }>
    ): Map<any, Array<{ lineIndex: number; line: string; taskId: string }>> {

        const tasksByBoss = new Map();

        for (const task of completedTasks) {
            // Extract boss-specific tag if present
            const bossTagMatch = task.line.match(/#boss-([a-zA-Z0-9-]+)/);
            const targetBossId = bossTagMatch ? bossTagMatch[1] : null;

            // Find target bosses
            const targetBosses = targetBossId
                ? activeBosses.filter(bossData =>
                    bossData.boss.id.includes(targetBossId) ||
                    bossData.boss.name.toLowerCase().includes(targetBossId.toLowerCase())
                )
                : activeBosses; // Apply to all active bosses if no specific tag

            // Add task to each target boss
            for (const bossData of targetBosses) {
                if (!tasksByBoss.has(bossData)) {
                    tasksByBoss.set(bossData, []);
                }
                tasksByBoss.get(bossData).push(task);
            }
        }

        return tasksByBoss;
    }

    /**
     * Deal batch damage to boss with optimized updates
     */
    private async dealBatchDamageToBoss(
        bossData: { boss: Boss; progress: BossProgress; quest: Quest },
        totalDamage: number,
        tasks: Array<{ lineIndex: number; line: string; taskId: string }>,
        filePath: string,
        silent = false
    ): Promise<void> {
        try {
            const oldHP = bossData.progress.currentHP;
            const newHP = Math.max(0, oldHP - totalDamage);

            // Update boss progress
            bossData.progress.currentHP = newHP;
            bossData.progress.lastUpdated = new Date();
            bossData.boss.stats.currentHP = newHP;

            // Create batch notification
            if (!silent) {
                const taskCount = tasks.length;
                const taskPreview = tasks.length === 1
                    ? tasks[0].line.substring(0, 47) + '...'
                    : `${taskCount} tasks completed`;

                new Notice(`⚔️ ${totalDamage} damage dealt to ${bossData.boss.name}!\n"${taskPreview}"`);
            }

            // Dispatch batch event for UI updates
            window.dispatchEvent(new CustomEvent('boss-quest-damage', {
                detail: {
                    bossId: bossData.boss.id,
                    bossName: bossData.boss.name,
                    damage: totalDamage,
                    oldHP,
                    newHP,
                    taskCount: tasks.length,
                    filePath
                }
            }));

            // Check for boss defeat
            if (newHP <= 0 && oldHP > 0) {
                await this.handleBossDefeat(bossData, silent);
            }

            console.log(`Dealt ${totalDamage} batch damage to ${bossData.boss.name} (${oldHP} → ${newHP} HP) from ${tasks.length} tasks`);

        } catch (error) {
            console.error('Failed to deal batch damage to boss:', error);
        }
    }

    /**
     * Background initialization for better startup performance
     */
    private async performBackgroundInitialization(): Promise<void> {
        try {
            // Preload frequently accessed data
            setTimeout(async () => {
                const allFiles = this.app.vault.getMarkdownFiles();

                // Process a small batch initially to warm up caches
                const initialBatch = allFiles.slice(0, 5);
                for (const file of initialBatch) {
                    await this.scanFileForCompletedQuestsOptimized(file, true);
                }
            }, 500);

        } catch (error) {
            console.error('Failed background initialization:', error);
        }
    }

    /**
     * Start performance monitoring and cleanup
     */
    private startPerformanceMonitoring(): void {
        // Cleanup processed tasks periodically
        setInterval(() => {
            if (this.processedTasks.size > 1000) {
                // Keep only recent tasks (last 500)
                const tasksArray = Array.from(this.processedTasks);
                this.processedTasks.clear();
                tasksArray.slice(-500).forEach(task => this.processedTasks.add(task));
            }
        }, 300000); // Every 5 minutes

        // Performance cache cleanup
        performanceCache.startCleanupInterval();
    }

    // Reuse methods from original implementation with minor optimizations
    private isCompletedTask(line: string): boolean {
        return /^[\s]*[-*+]\s*\[x\]/i.test(line.trim());
    }

    private isBossTask(line: string): boolean {
        return (line.includes('#gamified-task') && line.includes('#gamified-boss')) ||
            line.includes('#boss-quest') ||
            line.includes('#boss-') ||
            line.toLowerCase().includes('boss');
    }

    private generateTaskId(filePath: string, lineNumber: number, content: string): string {
        const contentHash = content.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '');
        return `${filePath}:${lineNumber}:${contentHash}`;
    }

    private calculateQuestDamage(questText: string, filePath: string): number {
        let baseDamage = 15;

        // Optimized keyword checking
        const lowerText = questText.toLowerCase();

        // Use includes for faster string searching
        if (lowerText.includes('complete') || lowerText.includes('finish') || lowerText.includes('master')) {
            baseDamage += 12;
        } else if (lowerText.includes('study') || lowerText.includes('practice') || lowerText.includes('improve')) {
            baseDamage += 8;
        } else if (lowerText.includes('read') || lowerText.includes('check') || lowerText.includes('update')) {
            baseDamage += 4;
        }

        // File-based bonuses
        if (filePath.includes('Boss-Quest') || filePath.includes('Gamified-Boss-Quests')) {
            baseDamage *= 1.4;
        }

        return Math.floor(baseDamage);
    }

    private async handleBossDefeat(bossData: { boss: Boss; progress: BossProgress; quest: Quest }, silent = false): Promise<void> {
        try {
            const result = bossManagementService.handleBossDefeat(bossData.boss.id);

            if (result) {
                if (!silent) {
                    new Notice(`🎉 Boss Defeated: ${result.boss.name}!`, 8000);
                }

                window.dispatchEvent(new CustomEvent('boss-defeated', {
                    detail: { boss: result.boss, rewards: result.rewards }
                }));
            }
        } catch (error) {
            console.error('Failed to handle boss defeat:', error);
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats(): {
        processedTaskCount: number;
        debounceTimerCount: number;
        batchQueueSize: number;
        isProcessingQueue: boolean;
        cacheStats: any;
    } {
        return {
            processedTaskCount: this.processedTasks.size,
            debounceTimerCount: this.debounceTimers.size,
            batchQueueSize: this.batchQueue.size,
            isProcessingQueue: this.processingQueue,
            cacheStats: performanceCache.getStats()
        };
    }
}

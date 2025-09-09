// Quest Completion Tracker Service
// Automatically detects quest completion and awards rewards

import { App, TFile, Notice } from 'obsidian';

export class QuestCompletionTracker {
    private app: App;
    private fileContentsCache: Map<string, string> = new Map();
    private isTracking: boolean = false;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Start tracking quest completions via file watching
     */
    startTracking(): void {
        if (this.isTracking) return;

        this.isTracking = true;
        console.log('[QuestTracker] Starting quest completion tracking...');

        // Watch for file modifications
        this.app.vault.on('modify', this.handleFileModified.bind(this) as any);

        // Initial cache population
        this.populateInitialCache();
    }

    /**
     * Stop tracking
     */
    stopTracking(): void {
        if (!this.isTracking) return;

        this.isTracking = false;
        this.app.vault.off('modify', this.handleFileModified.bind(this) as any);
        this.fileContentsCache.clear();

        console.log('[QuestTracker] Stopped quest completion tracking');
    }

    /**
     * Handle file modification events
     */
    private async handleFileModified(file: TFile): Promise<void> {
        // Only track markdown files
        if (file.extension !== 'md') return;

        try {
            const newContent = await this.app.vault.read(file);
            const oldContent = this.fileContentsCache.get(file.path) || '';

            // Update cache
            this.fileContentsCache.set(file.path, newContent);

            // Check for quest completions
            await this.detectQuestCompletions(file.path, oldContent, newContent);

        } catch (error) {
            console.error(`[QuestTracker] Error processing ${file.path}:`, error);
        }
    }

    /**
     * Detect quest completions by comparing old and new content
     */
    private async detectQuestCompletions(filePath: string, oldContent: string, newContent: string): Promise<void> {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');

        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
            const oldLine = oldLines[i] || '';
            const newLine = newLines[i] || '';

            // Check if a task was completed (changed from [ ] to [x])
            if (this.isTaskCompletion(oldLine, newLine)) {
                await this.processQuestCompletion(newLine, filePath, i + 1);
            }
        }
    }

    /**
     * Check if a line represents a task completion
     */
    private isTaskCompletion(oldLine: string, newLine: string): boolean {
        // Must have #gamified-task tag
        if (!newLine.includes('#gamified-task')) return false;

        // Old line must be unchecked, new line must be checked
        const wasUnchecked = oldLine.includes('- [ ]');
        const isNowChecked = newLine.includes('- [x]');

        return wasUnchecked && isNowChecked;
    }

    /**
     * Process a quest completion and award rewards
     */
    private async processQuestCompletion(taskLine: string, filePath: string, lineNumber: number): Promise<void> {
        try {
            // Extract quest information
            const title = this.extractTitle(taskLine);
            const xp = this.extractXP(taskLine);
            const coins = Math.round(xp * 0.1);
            const difficulty = this.extractDifficulty(taskLine);

            console.log(`[QuestTracker] Quest completed: "${title}" in ${filePath}:${lineNumber}`);

            // Award XP and coins
            const { playerStore } = await import('../../../shared/state/playerStore');
            await playerStore.addXP(xp);
            await playerStore.addCoins(coins);

            // Trigger achievement events
            const { achievementEventService } = await import('../../achievements/services/achievementEventService');
            await achievementEventService.processGameEvent({
                type: 'quest_completed',
                data: {
                    questData: {
                        title,
                        xp,
                        difficulty,
                        completion: 100
                    }
                },
                timestamp: new Date()
            });

            await achievementEventService.processGameEvent({
                type: 'task_completed',
                data: { taskData: { title, difficulty } },
                timestamp: new Date()
            });

            // Show success notification
            new Notice(`✅ Quest Complete! "${title}" (+${xp} XP, +${coins} coins)`, 5000);

        } catch (error) {
            console.error('[QuestTracker] Error processing quest completion:', error);
        }
    }

    /**
     * Extract clean title from task line
     */
    private extractTitle(taskLine: string): string {
        const taskMatch = taskLine.match(/- \[x\] (.+)/);
        if (!taskMatch) return 'Unknown Quest';

        return taskMatch[1]
            .split(/[#✨⭐🔥⚖️🌱]/)[0]
            .trim();
    }

    /**
     * Extract XP value from task line
     */
    private extractXP(taskLine: string): number {
        const xpMatch = taskLine.match(/✨(\d+)/);
        if (xpMatch) {
            return parseInt(xpMatch[1]);
        }

        // Default XP based on difficulty
        if (taskLine.includes('🔥')) return 100; // Hard
        if (taskLine.includes('🌱')) return 25;  // Easy
        return 50; // Medium
    }

    /**
     * Extract difficulty from task line
     */
    private extractDifficulty(taskLine: string): string {
        if (taskLine.includes('🔥')) return 'hard';
        if (taskLine.includes('🌱')) return 'easy';
        return 'medium';
    }

    /**
     * Populate initial cache with current file contents
     */
    private async populateInitialCache(): Promise<void> {
        const markdownFiles = this.app.vault.getMarkdownFiles();

        for (const file of markdownFiles) {
            try {
                const content = await this.app.vault.read(file);
                this.fileContentsCache.set(file.path, content);
            } catch (error) {
                console.error(`[QuestTracker] Error caching ${file.path}:`, error);
            }
        }

        console.log(`[QuestTracker] Cached ${markdownFiles.length} files for tracking`);
    }
}

// Quest Completion Tracker Service
// Automatically detects quest completion and awards rewards

import { App, TFile } from 'obsidian';
import { resolvePluginSettings, emitQuestCompletionFeedback, parseEnergyCostFromMarkdownLine } from '../../../shared/utils/questCompletionPipeline';
import { parseActivityProfileFromTaskLine } from '../../../shared/utils/questWellbeingProfiles';
import { getPluginSettingsFromApp } from '../../../shared/utils/gameplayConfig';

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

        // Initial cache population (optimized to only track GamifiedTasks.md)
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
        // Only track our main gamified tasks file to avoid scanning the entire vault
        if (file.extension !== 'md' || file.path !== 'GamifiedTasks.md') return;

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
            const title = this.extractTitle(taskLine);
            const xp = this.extractXP(taskLine);
            const cp = this.extractCP(taskLine);
            const coins = Math.round(xp * 0.1);
            const difficulty = this.extractDifficulty(taskLine);
            const skills = this.extractSkills(taskLine);

            console.log(`[QuestTracker] Quest completed: "${title}" in ${filePath}:${lineNumber}`);

            const energyFromLine = (() => {
                const m = taskLine.match(/🔋\s*(\d+)/);
                if (m) return Math.min(100, parseInt(m[1], 10));
                return parseEnergyCostFromMarkdownLine(taskLine);
            })();
            const activityId = parseActivityProfileFromTaskLine(taskLine);

            // Build a minimal Quest-shaped object so the shared pipeline can handle rewards.
            const questShim = {
                xp,
                cp,
                coins,
                skills,
                stats: [] as string[],
                ...(typeof energyFromLine === "number" ? { energyCost: energyFromLine } : {}),
                ...(activityId !== "generic" ? { activityProfile: activityId } : {}),
            } as unknown as import('../utils/taskParser').Quest;

            const { awardQuestRewards } = await import('../../../shared/utils/questCompletionPipeline');
            const rewardResult = await awardQuestRewards(this.app.vault, questShim, undefined, this.app);

            const { achievementEventService } = await import('../../achievements/services/achievementEventService');
            await achievementEventService.processGameEvent({
                type: 'quest_completed',
                data: { questData: { title, xp, difficulty, completion: 100 } },
                timestamp: new Date()
            });
            await achievementEventService.processGameEvent({
                type: 'task_completed',
                data: { taskData: { title, difficulty } },
                timestamp: new Date()
            });

            const settings = getPluginSettingsFromApp(this.app) ?? resolvePluginSettings(this.app);
            emitQuestCompletionFeedback(rewardResult, settings);

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
     * Extract CP value from task line
     */
    private extractCP(taskLine: string): number {
        const cpMatch = taskLine.match(/⭐(\d+)/);
        if (cpMatch) {
            return parseInt(cpMatch[1]);
        }
        return 0;
    }

    /**
     * Extract skills from task line metadata
     */
    private extractSkills(taskLine: string): string[] {
        const line = taskLine.toLowerCase();
        const fieldMatch = line.match(/skills:\s*([^|}#]+)/i);
        if (fieldMatch) {
            return fieldMatch[1]
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
        }
        const emojiMatch = taskLine.match(/🛠️\s*([^✨⭐💰🔁🔥⚖️🌱📅#\n\r]+)/);
        if (emojiMatch) {
            return emojiMatch[1]
                .split(/[;,]/)
                .map(s => s.trim())
                .filter(Boolean);
        }
        return [];
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
        try {
            const questFile = this.app.vault.getAbstractFileByPath('GamifiedTasks.md');
            if (questFile && questFile instanceof TFile) {
                const content = await this.app.vault.read(questFile);
                this.fileContentsCache.set(questFile.path, content);
                console.log('[QuestTracker] Cached GamifiedTasks.md for tracking');
            } else {
                console.log('[QuestTracker] GamifiedTasks.md not found, tracking disabled until file exists');
            }
        } catch (error) {
            console.error('[QuestTracker] Error caching GamifiedTasks.md:', error);
        }
    }
}
